import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Roles } from './decorators/roles.decorator';
import { RequirePermissions } from './decorators/permissions.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(user);
  }

  @Post('signup')
  async signup(@Body() body: any) {
    return this.authService.signupTenant(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    if (!email) throw new UnauthorizedException('Email is required');
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    if (!body.token || !body.newPassword) throw new UnauthorizedException('Token and new password are required');
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Post('seed-superadmin')
  async seedSuperadmin(@Body('setupKey') setupKey: string) {
    // Guard: only allow if the correct setup key is provided
    const expectedKey = process.env.SETUP_SECRET_KEY || 'CHANGE_THIS_IN_PRODUCTION';
    if (setupKey !== expectedKey) {
      throw new UnauthorizedException('Invalid setup key');
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

  @Post('google/callback')
  async googleCallback(@Body() body: any) {
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

