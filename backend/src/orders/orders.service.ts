import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

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
    
    // items should be array of { productId, quantity, priceAtTime }
    
    // Calculate total
    const totalAmount = items.reduce((acc: number, item: any) => acc + (parseFloat(item.priceAtTime) * item.quantity), 0);

    return this.prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
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

      // Deduct inventory
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && product.trackInventory) {
          await tx.product.update({
            where: { id: product.id },
            data: { stockCount: { decrement: item.quantity } }
          });
        }
      }

      return order;
    });
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

      // Handle inventory sync if status toggles between active and inactive states
      if (isCancelledOrRefunded && !wasCancelledOrRefunded) {
        // Return stock
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
        // Deduct stock again
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
