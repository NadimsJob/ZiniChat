export interface UnifiedMessage {
  tenantId: string;
  channel: string;
  channelConnectionId?: string;
  externalContactId: string;
  direction: 'inbound' | 'outbound';
  type: string;
  content: any;
  messageId?: string;
  timestamp: Date;
}

export interface IChannelAdapter {
  /**
   * Identifies the channel type (e.g., 'whatsapp', 'messenger')
   */
  getChannelType(): string;

  /**
   * Parses the raw incoming webhook payload into a unified message format
   */
  parseWebhookPayload(payload: any): Promise<UnifiedMessage[]>;

  /**
   * Sends a message out to the external channel API
   */
  sendMessage(tenantId: string, to: string, content: any): Promise<boolean>;
}
