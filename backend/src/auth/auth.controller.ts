import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Roles } from './decorators/roles.decorator';
import { RequirePermissions } from './decorators/permissions.decorator';
import { LoginDto, SignupDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, GoogleCallbackDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(user);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('signup')
  async signup(@Body() body: SignupDto) {
    return this.authService.signupTenant(body);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('seed-superadmin')
  async seedSuperadmin(@Body('setupKey') setupKey: string) {
    // Guard: only allow if the correct setup key is provided
    const expectedKey = process.env.SETUP_SECRET_KEY;
    if (!expectedKey || setupKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or unconfigured setup key');
    }
    return this.authService.seedSuperadmin();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: any) {
    return this.authService.getMe(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding')
  completeOnboarding(@Request() req: any, @Body() body: any) {
    return this.authService.updateOnboarding(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('setup-status')
  getSetupStatus(@Request() req: any) {
    return this.authService.getSetupStatus(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@Request() req: any, @Body() body: any) {
    return this.authService.changePassword(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        cb(new Error('Only image files are allowed!'), false);
      } else {
        cb(null, true);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  }))
  updateProfile(
    @Request() req: any,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.authService.updateProfile(
      req.user.userId,
      { name: body.name },
      file?.filename,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tenant-logo')
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: './uploads/logos',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'tenant_logo_' + uniqueSuffix + extname(file.originalname));
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/)) {
        cb(new Error('Only image files are allowed!'), false);
      } else {
        cb(null, true);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  updateTenantLogo(
    @Request() req: any,
    @Body('logoUrl') logoUrlInput?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const logoUrl = file ? `/uploads/logos/${file.filename}` : logoUrlInput;
    return this.authService.updateTenantLogo(req.user.userId, logoUrl || '');
  }


  // Public endpoint to check if Google Auth is enabled and get client ID
  @Get('google/config')
  async getGoogleConfig() {
    return this.authService.getGoogleConfig();
  }

  // Superadmin endpoint to get Google settings
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:site')
  @Get('google/settings')
  async getGoogleSettings() {
    return this.authService.getGoogleSettings();
  }

  // Superadmin endpoint to save Google settings
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:site')
  @Patch('google/settings')
  async updateGoogleSettings(@Body() body: any) {
    return this.authService.updateGoogleSettings(body);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('google/callback')
  async googleCallback(@Body() body: GoogleCallbackDto) {
    return this.authService.googleCallback(body.credential, body.planId);
  }

  // Superadmin endpoint to get Facebook settings
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:site')
  @Get('facebook/settings')
  async getFacebookSettings() {
    return this.authService.getFacebookSettings();
  }

  // Superadmin endpoint to save Facebook settings
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('superadmin')
  @RequirePermissions('manage:site')
  @Patch('facebook/settings')
  async updateFacebookSettings(@Body() body: any) {
    return this.authService.updateFacebookSettings(body);
  }
}

