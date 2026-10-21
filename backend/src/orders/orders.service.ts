import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../inbox/activity-log.service';
import { CapiHubService } from '../capi-hub/capi-hub.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ActivityLogService)) private activityLogService: ActivityLogService,
    private capiHubService: CapiHubService
  ) {}

  async getOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: { tenantId },
      include: {
        contact: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createOrder(tenantId: string, data: any) {
    const { contactId, conversationId, items, notes, createdBy } = data;

    const validatedItems: any[] = [];
    let totalAmount = 0;

    const order = await this.prisma.$transaction(async (tx) => {
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          // Enforce tenant scoping and active product check
          const product = await tx.product.findFirst({
            where: { id: item.productId, tenantId, isActive: true }
          });

          if (!product) {
            throw new NotFoundException(`Product ${item.productId} not found or inactive for this workspace`);
          }

          const quantity = Number(item.quantity) || 1;
          // Allow custom manual unit price if provided by merchant, otherwise fallback to DB product price
          const priceAtTime = (item.priceAtTime !== undefined && item.priceAtTime !== null && !isNaN(Number(item.priceAtTime)))
            ? Number(item.priceAtTime)
            : Number(product.price);
          totalAmount += priceAtTime * quantity;

          validatedItems.push({
            productId: product.id,
            quantity,
            priceAtTime
          });

          if (product.trackInventory) {
            if (product.stockCount < quantity) {
              throw new BadRequestException(`Insufficient stock for product: ${product.name}`);
            }
            await tx.product.update({
              where: { id: product.id },
              data: { stockCount: { decrement: quantity } }
            });
          }
        }
      }

      // Outreach Attribution Hook (REQ-Phase 7)
      let outreachCampaignId = data.outreachCampaignId;
      let outreachLeadId = data.outreachLeadId;
      const trackingToken = data.outreachTrackingToken || data.trackingToken;

      if (trackingToken && !outreachLeadId && tx.campaignLead) {
        const lead = await tx.campaignLead.findUnique({
          where: { trackingToken },
        });
        if (lead) {
          outreachLeadId = lead.id;
          outreachCampaignId = lead.campaignId;
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          tenantId,
          contactId,
          conversationId,
          totalAmount,
          notes,
          createdBy: createdBy || 'agent',
          status: 'pending',
          outreachCampaignId,
          outreachLeadId,
          items: {
            create: validatedItems
          }
        }
      });

      // Update Outreach Campaign & Lead Metrics if attributed
      if (outreachCampaignId && outreachLeadId && tx.campaignLead && tx.emailCampaign) {
        await tx.campaignLead.update({
          where: { id: outreachLeadId },
          data: {
            orderedAt: new Date(),
            orderId: createdOrder.id,
            orderAmount: totalAmount,
            status: 'ordered',
          },
        }).catch(() => {});

        await tx.emailCampaign.update({
          where: { id: outreachCampaignId },
          data: {
            ordersCount: { increment: 1 },
            revenueGenerated: { increment: totalAmount },
          },
        }).catch(() => {});
      }

      if (conversationId) {
        await tx.conversation.update({
          where: { id: conversationId },
          data: { hasOrderRequest: true }
        });
      }

      return createdOrder;
    });

    if (conversationId) {
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'ORDER_CREATED',
        metadataJson: { orderId: order.id, totalAmount: order.totalAmount }
      });
    }

    // Trigger CAPI Purchase on creation
    if (contactId && this.prisma?.contact?.findFirst) {
      this.prisma.contact.findFirst({ where: { id: contactId, tenantId } })
        .then((contact) => {
          this.capiHubService.fireEvent(tenantId, 'Purchase', {
            event_id: `order_${order.id}`,
            event_source_url: 'order_creation',
            user_data: {
              em: contact?.email || undefined,
              ph: contact?.phone || undefined,
              fn: contact?.name || undefined
            },
            custom_data: {
              value: order.totalAmount,
              currency: 'BDT',
              order_id: order.id,
              content_ids: items?.map((i: any) => i.productId) || []
            }
          }, 'order').catch(() => {});
        })
        .catch(() => {});
    }

    return order;
  }

  async updateOrderStatus(tenantId: string, orderId: string, status: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true, contact: true }
    });

    if (!order) throw new NotFoundException('Order not found');

    const previousStatus = order.status;
    const isCancelledOrRefunded = ['cancelled', 'refunded'].includes(status);
    const wasCancelledOrRefunded = ['cancelled', 'refunded'].includes(previousStatus);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status }
      });

      if (isCancelledOrRefunded && !wasCancelledOrRefunded) {
        for (const item of order.items) {
          const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
          if (product && product.trackInventory) {
            await tx.product.update({
              where: { id: product.id },
              data: { stockCount: { increment: item.quantity } }
            });
          }
        }
      } else if (!isCancelledOrRefunded && wasCancelledOrRefunded) {
        for (const item of order.items) {
          const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
          if (product && product.trackInventory) {
            await tx.product.update({
              where: { id: product.id },
              data: { stockCount: { decrement: item.quantity } }
            });
          }
        }
      }

      return updatedOrder;
    });

    const isNowFinalized = ['confirmed', 'completed'].includes(status);
    const wasFinalized = ['confirmed', 'completed'].includes(previousStatus);

    if (isNowFinalized && !wasFinalized) {
      const contact = order.contact;
      this.capiHubService.fireEvent(tenantId, 'Purchase', {
        event_id: `order_${order.id}`,
        event_source_url: 'order_management',
        user_data: {
          em: contact?.email || undefined,
          ph: contact?.phone || undefined,
          fn: contact?.name || undefined
        },
        custom_data: {
          value: order.totalAmount,
          currency: 'BDT',
          order_id: order.id,
          content_ids: order.items.map(i => i.productId)
        }
      }, 'order').catch(() => {});
    }

    return result;
  }
}
