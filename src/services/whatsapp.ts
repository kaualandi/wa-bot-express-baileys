import makeWASocket, { ConnectionState, DisconnectReason, useMultiFileAuthState, WASocket, getContentType, MessageUpsertType, WAMessage, AnyMessageContent, AnyRegularMessageContent, WAUrlInfo, getUrlInfo, } from "@whiskeysockets/baileys";
import * as qrcodeTerminal from "qrcode-terminal";
import { Boom } from "@hapi/boom";
import * as QRCode from "qrcode";

import { LinkValidator } from "../utils/linkValidator";
import BaileysConfig from "../config/baileys";


export class WhatsAppService {
  private socket: WASocket | null = null;
  private isConnected = false;
  private currentQR: string | null = null;
  private qrCodeImage: string | null = null;
  private messageCallback: (message: WAMessage) => void = () => {};

  constructor() {
    this.initializeBot();
  }

  private async initializeBot() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(
        BaileysConfig.authDir
      );

      this.socket = makeWASocket({
        auth: state,
        version: BaileysConfig.version,
        printQRInTerminal: BaileysConfig.printQRInTerminal,
        logger: {
          level: "error",
          info: () => {},
          error: console.error,
          warn: console.warn,
          debug: () => {},
          trace: () => {},
          child: () => ({
            level: "error",
            info: () => {},
            error: console.error,
            warn: console.warn,
            debug: () => {},
            trace: () => {},
            child: () => ({} as any),
          }),
        } as any,
        browser: BaileysConfig.browser,
        generateHighQualityLinkPreview:
          BaileysConfig.generateHighQualityLinkPreview,
        markOnlineOnConnect: BaileysConfig.markOnlineOnConnect,
        syncFullHistory: BaileysConfig.syncFullHistory,
        defaultQueryTimeoutMs: BaileysConfig.defaultQueryTimeoutMs,
        retryRequestDelayMs: BaileysConfig.retryRequestDelayMs,
        maxMsgRetryCount: BaileysConfig.maxMsgRetryCount,
        getMessage: BaileysConfig.getMessage,
      });

      this.socket.ev.on("connection.update", (update) => {
        this.handleConnectionUpdate(update);
      });

      this.socket.ev.on("creds.update", saveCreds);

      this.socket.ev.on("messages.upsert", (messageUpdate) => {
        this.handleMessage(messageUpdate);
      });
    } catch (error) {
      console.error("Erro ao inicializar bot:", error);
      setTimeout(() => this.initializeBot(), 5000);
    }
  }

  private async handleConnectionUpdate(update: Partial<ConnectionState>) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n🔗 QR Code gerado para WhatsApp");
      qrcodeTerminal.generate(qr, { small: true });

      // Armazena o QR code atual
      this.currentQR = qr;

      // Gera imagem do QR code em base64
      try {
        this.qrCodeImage = await QRCode.toDataURL(qr, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        console.log("✅ QR Code disponível via API: GET /qr");
      } catch (error) {
        console.error("Erro ao gerar QR Code como imagem:", error);
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("Conexão fechada devido a:", lastDisconnect?.error);

      // Limpa QR code quando desconecta
      this.currentQR = null;
      this.qrCodeImage = null;

      if (shouldReconnect) {
        console.log("Reconectando...");
        setTimeout(() => this.initializeBot(), 3000);
      } else {
        console.log(
          "Desconectado permanentemente. Limpe a pasta auth_info e reinicie."
        );
      }
      this.isConnected = false;
    } else if (connection === "open") {
      console.log("\x1b[1;32m✓ WhatsApp conectado com sucesso!\x1b[0m");
      // Limpa QR code quando conecta
      this.currentQR = null;
      this.qrCodeImage = null;
      this.isConnected = true;
    }
  }

  private async handleMessage(messageUpdate: {
    messages: WAMessage[];
    type: MessageUpsertType;
  }) {
    const { messages, type } = messageUpdate;

    if (type !== "notify") return;

    for (const message of messages) {
      if (!message.message) continue;
      if (message.key.fromMe) continue; // Ignora mensagens enviadas pelo próprio bot

      const messageContent = message.message;
      const messageType = getContentType(messageContent);
      const chatId = message.key.remoteJid!;
      const senderId = message.key.participant || chatId;

      let textMessage = "";

      if (messageType === "conversation") {
        textMessage = messageContent.conversation || "";
      } else if (messageType === "extendedTextMessage") {
        textMessage = messageContent.extendedTextMessage?.text || "";
      }

      console.log(`[Mensagem recebida] ${chatId}: ${textMessage}`);

      // Comando ping-pong simples
      if (textMessage.toLowerCase() === "!ping") {
        await this.sendMessage(chatId, "Pong! 🏓");
      }

      // Chama o callback para qualquer mensagem recebida
      this.messageCallback(message);
    }
  }

  public async sendMessage(chatId: string, message: string, withPreview = false): Promise<boolean> {
    if (!this.socket || !this.isConnected) {
      throw new Error("WhatsApp não está conectado");
    }

    let linkPreview: WAUrlInfo | undefined;
    const urlFromText = LinkValidator.extractFirstLink(message);
    if (urlFromText && withPreview) {
      linkPreview = await getUrlInfo(urlFromText, {
        thumbnailWidth: 1024,
        fetchOpts: {
          timeout: 5000,
        },
        uploadImage: this.socket.waUploadToServer,
      });
    }

    try {
      await this.socket.sendMessage(chatId, { text: message, linkPreview });
      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      return false;
    }
  }

  public async sendImageWithCaption(
    chatId: string,
    imageBuffer: Buffer,
    caption?: string
  ): Promise<boolean> {
    if (!this.socket || !this.isConnected) {
      throw new Error("WhatsApp não está conectado");
    }

    try {
      await this.socket.sendMessage(chatId, {
        image: imageBuffer,
        caption: caption || "",
      });
      return true;
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      return false;
    }
  }

  public async checkNumberExists(
    number: string
  ): Promise<{ exists: boolean; jid?: string }> {
    if (!this.socket || !this.isConnected) {
      throw new Error("WhatsApp não está conectado");
    }

    try {
      // Remove caracteres especiais e adiciona código do país se necessário
      const cleanNumber = number.replace(/\D/g, "");
      const formattedNumber = cleanNumber.startsWith("55")
        ? cleanNumber
        : `55${cleanNumber}`;

      const results = await this.socket.onWhatsApp(
        `${formattedNumber}@s.whatsapp.net`
      );
      const result = results?.[0];

      return {
        exists: !!result?.exists,
        jid: result?.jid,
      };
    } catch (error) {
      console.error("Erro ao verificar número:", error);
      return { exists: false };
    }
  }

  public async getGroups(): Promise<any[]> {
    if (!this.socket || !this.isConnected) {
      throw new Error("WhatsApp não está conectado");
    }

    try {
      const groups = await this.socket.groupFetchAllParticipating();
      return Object.values(groups).map((group) => ({
        id: group.id,
        name: group.subject,
        description: group.desc,
        participants: group.participants?.length || 0,
        creation: group.creation,
        owner: group.owner,
      }));
    } catch (error) {
      console.error("Erro ao buscar grupos:", error);
      return [];
    }
  }

  public async getGroupInfo(groupId: string): Promise<any | null> {
    if (!this.socket || !this.isConnected) {
      throw new Error("WhatsApp não está conectado");
    }

    try {
      const groupInfo = await this.socket.groupMetadata(groupId);
      return {
        id: groupInfo.id,
        name: groupInfo.subject,
        description: groupInfo.desc,
        participants: groupInfo.participants?.length || 0,
        creation: groupInfo.creation,
        owner: groupInfo.owner,
      };
    } catch (error) {
      console.error("Erro ao buscar informações do grupo:", error);
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
      return me?.id?.split(":")[0] || null;
    } catch (error) {
      console.error("Erro ao obter número:", error);
      return null;
    }
  }

  public getCurrentQR(): string | null {
    return this.currentQR;
  }

  public getQRCodeImage(): string | null {
    return this.qrCodeImage;
  }

  public hasQRCode(): boolean {
    return this.currentQR !== null;
  }

  public onAnyMessage(callback: (message: WAMessage) => void): void {
    this.messageCallback = callback;
  }
}
