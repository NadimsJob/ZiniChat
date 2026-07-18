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
  namespace: 'notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  
  // Maps userId -> Socket client IDs
  private userSockets = new Map<string, string[]>();

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // Quick jwt decoding to extract userId
      const decoded: any = jwt.decode(token);
      if (!decoded || !decoded.sub) {
        client.disconnect();
        return;
      }

      const userId = decoded.sub;
      client.data = { userId };
      
      const existing = this.userSockets.get(userId) || [];
      existing.push(client.id);
      this.userSockets.set(userId, existing);

      this.logger.log(`Client connected: ${client.id} associated with User ID: ${userId}`);
    } catch (err) {
      this.logger.error('Socket connection auth failed:', err);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      const updated = sockets.filter(id => id !== client.id);
      if (updated.length === 0) {
        this.userSockets.delete(userId);
      } else {
        this.userSockets.set(userId, updated);
      }
      this.logger.log(`Client disconnected: ${client.id} associated with User ID: ${userId}`);
    }
  }

  // Sends real-time notification to a specific user
  sendToUser(userId: string, event: string, payload: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.length > 0) {
      socketIds.forEach(socketId => {
        this.server.to(socketId).emit(event, payload);
      });
      this.logger.log(`Pushed real-time socket notification to User ID: ${userId}`);
      return true;
    }
    return false;
  }

  // Sends real-time notification to all connected clients (useful for platform-wide alerts)
  sendToAll(event: string, payload: any) {
    this.server.emit(event, payload);
    this.logger.log(`Pushed real-time socket notification to all users`);
  }
}
