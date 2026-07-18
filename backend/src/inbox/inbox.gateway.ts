import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  SubscribeMessage
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'inbox'
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InboxGateway.name);

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // Quick jwt decoding to extract tenantId
      const decoded: any = jwt.decode(token);
      if (!decoded || !decoded.tenantId) {
        client.disconnect();
        return;
      }

      const tenantId = decoded.tenantId;
      client.data = { tenantId, userId: decoded.sub };
      
      // Join a room specifically for this tenant's inbox
      const roomName = `tenant_${tenantId}`;
      client.join(roomName);

      this.logger.log(`Inbox Client connected: ${client.id} joined room ${roomName}`);
    } catch (err) {
      this.logger.error('Inbox socket connection auth failed:', err);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Inbox Client disconnected: ${client.id}`);
  }

  // Used by backend services to push updates (e.g. new incoming message from webhook)
  broadcastToTenant(tenantId: string, event: string, payload: any) {
    const roomName = `tenant_${tenantId}`;
    this.server.to(roomName).emit(event, payload);
    this.logger.log(`Broadcasted '${event}' to room ${roomName}`);
  }

  // Optional: Listen for typing indicators from the frontend
  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: { conversationId: string, isTyping: boolean }) {
    const tenantId = client.data?.tenantId;
    if (tenantId) {
      // Broadcast to others in the same tenant room (excluding sender)
      client.broadcast.to(`tenant_${tenantId}`).emit('agent_typing', {
        conversationId: payload.conversationId,
        userId: client.data.userId,
        isTyping: payload.isTyping
      });
    }
  }
}
