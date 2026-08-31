import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
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

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Order items must be a non-empty array');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const validatedItems = [];

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

      const createdOrder = await tx.order.create({
        data: {
          tenantId,
          contactId,
          conversationId,
          totalAmount,
          notes,
          status: 'pending',
          items: {
            create: validatedItems
          }
        }
      });

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

    return order;
  }

  async updateOrderStatus(tenantId: string, orderId: string, status: string) {
    const order = await this.prisma.order.findFirst({
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
  }
}
