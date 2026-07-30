import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async getOrders(@Request() req: any) {
    return this.ordersService.getOrders(req.user.tenantId);
  }

  @Post()
  async createOrder(@Request() req: any, @Body() body: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.tenantId, body);
  }

  @Patch(':id/status')
  async updateOrderStatus(@Request() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateOrderStatus(req.user.tenantId, id, status);
  }
}
