import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// ─── User-Agent Parser ───────────────────────────────────────────────────────
function parseUserAgent(ua: string): { browser: string; os: string; deviceType: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', deviceType: 'Unknown' };

  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'Desktop';

  // Device type
  if (/bot|crawler|spider|scraper|crawling/i.test(ua)) {
    deviceType = 'Bot';
  } else if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (/tablet|ipad|kindle|silk/i.test(ua)) {
    deviceType = 'Tablet';
  }

  // OS
  if (/windows nt 11/i.test(ua)) os = 'Windows 11';
  else if (/windows nt 10/i.test(ua)) os = 'Windows 10';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) {
    const m = ua.match(/mac os x (\d+[\._]\d+)/i);
    os = m ? `macOS ${m[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/android (\d+)/i.test(ua)) {
    const m = ua.match(/android (\d+)/i);
    os = m ? `Android ${m[1]}` : 'Android';
  } else if (/iphone os (\d+)/i.test(ua)) {
    const m = ua.match(/iphone os (\d+)/i);
    os = m ? `iOS ${m[1]}` : 'iOS';
  } else if (/linux/i.test(ua)) os = 'Linux';

  // Browser
  if (/edg\//i.test(ua)) {
    const m = ua.match(/edg\/(\d+)/i);
    browser = m ? `Edge ${m[1]}` : 'Edge';
  } else if (/opr\/|opera/i.test(ua)) {
    const m = ua.match(/opr\/(\d+)/i);
    browser = m ? `Opera ${m[1]}` : 'Opera';
  } else if (/chrome\/(\d+)/i.test(ua) && !/chromium/i.test(ua)) {
    const m = ua.match(/chrome\/(\d+)/i);
    browser = m ? `Chrome ${m[1]}` : 'Chrome';
  } else if (/firefox\/(\d+)/i.test(ua)) {
    const m = ua.match(/firefox\/(\d+)/i);
    browser = m ? `Firefox ${m[1]}` : 'Firefox';
  } else if (/safari\/(\d+)/i.test(ua)) {
    const m = ua.match(/version\/(\d+)/i);
    browser = m ? `Safari ${m[1]}` : 'Safari';
  }

  return { browser, os, deviceType };
}

// ─── Geo IP Lookup (ip-api.com — free, 45 req/min) ──────────────────────────
async function lookupGeo(ip: string): Promise<{ country?: string; region?: string; city?: string }> {
  const privateIp = /^(127\.|::1|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip);
  if (privateIp || !ip || ip === 'unknown') return { country: 'Local', region: 'Local', city: 'Local' };

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=country,regionName,city`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return {};
    const data: any = await res.json();
    if (data.status === 'fail') return {};
    return { country: data.country, region: data.regionName, city: data.city };
  } catch {
    return {};
  }
}

// ─── DTO ─────────────────────────────────────────────────────────────────────
export interface CreateLoginLogDto {
  userId?: string | null;
  email: string;
  ipAddress: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED' | 'LOCKED_OUT';
  failReason?: string;
  authMethod?: string;
}

@Injectable()
export class LoginLogsService {
  private readonly logger = new Logger(LoginLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Create a login log (async fire-and-forget; never blocks login) ───────
  createLogAsync(dto: CreateLoginLogDto): void {
    this.createLog(dto).catch((err) =>
      this.logger.error('Failed to write login log', err?.message),
    );
  }

  async createLog(dto: CreateLoginLogDto): Promise<void> {
    const { browser, os, deviceType } = parseUserAgent(dto.userAgent || '');
    const geo = await lookupGeo(dto.ipAddress);

    await this.prisma.loginLog.create({
      data: {
        userId: dto.userId || null,
        email: dto.email.toLowerCase().trim(),
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent ? dto.userAgent.substring(0, 512) : null,
        browser,
        os,
        deviceType,
        country: geo.country || null,
        region: geo.region || null,
        city: geo.city || null,
        status: dto.status,
        failReason: dto.failReason || null,
        authMethod: dto.authMethod || 'password',
      },
    });
  }

  // ─── Superadmin: paginated query with filters ─────────────────────────────
  async getLoginLogs(params: {
    page?: number;
    limit?: number;
    status?: string;
    email?: string;
    ipAddress?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, params.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status) where.status = params.status.toUpperCase();
    if (params.email) where.email = { contains: params.email.toLowerCase(), mode: 'insensitive' };
    if (params.ipAddress) where.ipAddress = { contains: params.ipAddress };

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) {
        const end = new Date(params.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.loginLog.count({ where }),
      this.prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          userId: true,
          ipAddress: true,
          browser: true,
          os: true,
          deviceType: true,
          country: true,
          region: true,
          city: true,
          status: true,
          failReason: true,
          authMethod: true,
          createdAt: true,
          // Never return userAgent raw string to avoid leaking headers; use parsed values only
        },
      }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Superadmin: summary stats ────────────────────────────────────────────
  async getStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total24h, failed24h, success24h, total7d, failed7d] = await this.prisma.$transaction([
      this.prisma.loginLog.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.loginLog.count({ where: { createdAt: { gte: last24h }, status: 'FAILED' } }),
      this.prisma.loginLog.count({ where: { createdAt: { gte: last24h }, status: 'SUCCESS' } }),
      this.prisma.loginLog.count({ where: { createdAt: { gte: last7d } } }),
      this.prisma.loginLog.count({ where: { createdAt: { gte: last7d }, status: 'FAILED' } }),
    ]);

    // Top 5 IPs with failed attempts in last 24h
    const topFailedIps = await this.prisma.loginLog.groupBy({
      by: ['ipAddress'],
      where: { createdAt: { gte: last24h }, status: { in: ['FAILED', 'LOCKED_OUT'] } },
      _count: { ipAddress: true },
      orderBy: { _count: { ipAddress: 'desc' } },
      take: 5,
    });

    return {
      last24h: { total: total24h, success: success24h, failed: failed24h },
      last7d: { total: total7d, failed: failed7d },
      topFailedIps: topFailedIps.map((r) => ({ ip: r.ipAddress, count: r._count.ipAddress })),
    };
  }

  // ─── Cron: 90-day TTL auto-cleanup (runs daily at 3:00 AM server time) ────
  @Cron('0 3 * * *')
  async cleanupOldLogs() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.prisma.loginLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    if (result.count > 0) {
      this.logger.log(`[Login Log TTL] Purged ${result.count} records older than 90 days.`);
    }
  }
}
