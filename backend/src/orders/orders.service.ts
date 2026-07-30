import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../inbox/activity-log.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ActivityLogService)) private activityLogService: ActivityLogService
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
    const { contactId, conversationId, items, notes } = data;
    
    const totalAmount = items.reduce((acc: number, item: any) => acc + (parseFloat(item.priceAtTime) * item.quantity), 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          tenantId,
          contactId,
          conversationId,
          totalAmount,
          notes,
          status: 'pending',
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceAtTime: item.priceAtTime
            }))
          }
        }
      });

      if (conversationId) {
        await tx.conversation.update({
          where: { id: conversationId },
          data: { hasOrderRequest: true }
        });
      }

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && product.trackInventory) {
          await tx.product.update({
            where: { id: product.id },
            data: { stockCount: { decrement: item.quantity } }
          });
        }
      }

      return createdOrder;
    });

    if (conversationId) {
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'ORDER_CREATED',
        metadataJson: { orderId: order.id, totalAmount }
      });
    }

    return order;
  }

  async updateOrderStatus(tenantId: string, orderId: string, status: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: { items: true }
    });

    if (!order) throw new NotFoundException('Order not found');

    const previousStatus = order.status;
    const isCancelledOrRefunded = ['cancelled', 'refunded'].includes(status);
    const wasCancelledOrRefunded = ['cancelled', 'refunded'].includes(previousStatus);

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status }
      });

      if (isCancelledOrRefunded && !wasCancelledOrRefunded) {
        for (const item of order.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product && product.trackInventory) {
            await tx.product.update({
              where: { id: product.id },
              data: { stockCount: { increment: item.quantity } }
            });
          }
        }
      } else if (!isCancelledOrRefunded && wasCancelledOrRefunded) {
        for (const item of order.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
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
  }
}
