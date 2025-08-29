import makeWASocket, { ConnectionState, DisconnectReason, useMultiFileAuthState, WASocket, proto, getContentType, downloadMediaMessage, MessageUpsertType, WAMessageContent, WAMessageKey } from '@whiskeysockets/baileys';
import * as qrcode from 'qrcode-terminal';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';

import BaileysConfig from '../config/baileys';


export class WhatsAppService {
  private socket: WASocket | null = null;
  private isConnected = false;

  constructor() {
    this.initializeBot();
  }

  private async initializeBot() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(BaileysConfig.authDir);

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: BaileysConfig.printQRInTerminal,
        logger: {
          level: 'error',
          info: () => {},
          error: console.error,
          warn: console.warn,
          debug: () => {},
          trace: () => {},
          child: () => ({
            level: 'error',
            info: () => {},
            error: console.error,
            warn: console.warn,
            debug: () => {},
            trace: () => {},
            child: () => ({} as any),
          }),
        } as any,
        browser: BaileysConfig.browser,
        generateHighQualityLinkPreview: BaileysConfig.generateHighQualityLinkPreview,
        markOnlineOnConnect: BaileysConfig.markOnlineOnConnect,
        syncFullHistory: BaileysConfig.syncFullHistory,
        defaultQueryTimeoutMs: BaileysConfig.defaultQueryTimeoutMs,
        retryRequestDelayMs: BaileysConfig.retryRequestDelayMs,
        maxMsgRetryCount: BaileysConfig.maxMsgRetryCount,
        getMessage: BaileysConfig.getMessage,
      });

      this.socket.ev.on('connection.update', (update) => {
        this.handleConnectionUpdate(update);
      });

      this.socket.ev.on('creds.update', saveCreds);

      this.socket.ev.on('messages.upsert', (messageUpdate) => {
        this.handleMessage(messageUpdate);
      });

    } catch (error) {
      console.error('Erro ao inicializar bot:', error);
      setTimeout(() => this.initializeBot(), 5000);
    }
  }

  private handleConnectionUpdate(update: Partial<ConnectionState>) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n🔗 Escaneie o QR Code abaixo com seu WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão fechada devido a:', lastDisconnect?.error);
      
      if (shouldReconnect) {
        console.log('Reconectando...');
        setTimeout(() => this.initializeBot(), 3000);
      } else {
        console.log('Desconectado permanentemente. Limpe a pasta auth_info e reinicie.');
      }
      this.isConnected = false;
    } else if (connection === 'open') {
      console.log('\x1b[1;32m✓ WhatsApp conectado com sucesso!\x1b[0m');
      this.isConnected = true;
    }
  }

  private async handleMessage(messageUpdate: { messages: proto.IWebMessageInfo[], type: MessageUpsertType }) {
    const { messages, type } = messageUpdate;

    if (type !== 'notify') return;

    for (const message of messages) {
      if (!message.message) continue;
      if (message.key.fromMe) continue; // Ignora mensagens enviadas pelo próprio bot

      const messageContent = message.message;
      const messageType = getContentType(messageContent);
      const chatId = message.key.remoteJid!;
      const senderId = message.key.participant || chatId;

      let textMessage = '';
      
      if (messageType === 'conversation') {
        textMessage = messageContent.conversation || '';
      } else if (messageType === 'extendedTextMessage') {
        textMessage = messageContent.extendedTextMessage?.text || '';
      }

      console.log(`[Mensagem recebida] ${chatId}: ${textMessage}`);

      // Comando ping-pong simples
      if (textMessage.toLowerCase() === '!ping') {
        await this.sendMessage(chatId, 'Pong! 🏓');
      }
    }
  }

  public async sendMessage(chatId: string, message: string): Promise<boolean> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      await this.socket.sendMessage(chatId, { text: message });
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }

  public async sendImageWithCaption(chatId: string, imageBuffer: Buffer, caption?: string): Promise<boolean> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      await this.socket.sendMessage(chatId, {
        image: imageBuffer,
        caption: caption || ''
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      return false;
    }
  }

  public async checkNumberExists(number: string): Promise<{ exists: boolean; jid?: string }> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      // Remove caracteres especiais e adiciona código do país se necessário
      const cleanNumber = number.replace(/\D/g, '');
      const formattedNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
      
      const results = await this.socket.onWhatsApp(`${formattedNumber}@s.whatsapp.net`);
      const result = results?.[0];
      
      return {
        exists: !!result?.exists,
        jid: result?.jid
      };
    } catch (error) {
      console.error('Erro ao verificar número:', error);
      return { exists: false };
    }
  }

  public async getGroups(): Promise<any[]> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      const groups = await this.socket.groupFetchAllParticipating();
      return Object.values(groups).map(group => ({
        id: group.id,
        name: group.subject,
        description: group.desc,
        participants: group.participants?.length || 0,
        creation: group.creation,
        owner: group.owner
      }));
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      return [];
    }
  }

  public async getGroupInfo(groupId: string): Promise<any | null> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      const groupInfo = await this.socket.groupMetadata(groupId);
      return {
        id: groupInfo.id,
        name: groupInfo.subject,
        description: groupInfo.desc,
        participants: groupInfo.participants?.length || 0,
        creation: groupInfo.creation,
        owner: groupInfo.owner
      };
    } catch (error) {
      console.error('Erro ao buscar informações do grupo:', error);
      return null;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async getMyNumber(): Promise<string | null> {
    if (!this.socket || !this.isConnected) {
      return null;
    }
    
    try {
      const me = this.socket.user;
      return me?.id?.split(':')[0] || null;
    } catch (error) {
      console.error('Erro ao obter número:', error);
      return null;
    }
  }
}
