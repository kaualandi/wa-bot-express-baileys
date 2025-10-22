import { WAMessage } from "@whiskeysockets/baileys";
import { Request, Response } from "express";
import express from "express";
import axios from "axios";
import fs from "fs";

import { PhoneValidator } from "./utils/phoneValidator";
import { WhatsAppService } from "./services/whatsapp";


require("dotenv").config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 80;

// Instância do serviço WhatsApp
const whatsappService = new WhatsAppService();

// Aguarda um tempo para a conexão ser estabelecida
setTimeout(() => {
  console.log(`\n• Listening on port ${port}!`);
  
  app.listen(port, function () {
    console.log(`\n• Servidor iniciado na porta ${port}!`);
  });
}, 5000);


app.get("/", (req: Request, res: Response) => {
  res.sendFile(__dirname + '/qr.html');
});

  app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    worked: true,
    detail: "Servidor funcionando!",
    whatsappConnected: whatsappService.getConnectionStatus(),
  });
});
  
app.get("/status", async (req: Request, res: Response) => {
  const myNumber = await whatsappService.getMyNumber();
  res.status(200).json({
    worked: true,
    detail: "Status do WhatsApp",
    connected: whatsappService.getConnectionStatus(),
    number: myNumber,
    hasQR: whatsappService.hasQRCode(),
  });
});

app.get("/qr", (req: Request, res: Response) => {
  const qrImage = whatsappService.getQRCodeImage();
  const qrText = whatsappService.getCurrentQR();
  
  if (!qrImage || !qrText) {
    res.status(404).json({
      worked: false,
      detail: "QR Code não disponível",
      reason: whatsappService.getConnectionStatus() 
        ? "WhatsApp já está conectado" 
        : "QR Code ainda não foi gerado. Aguarde alguns segundos e tente novamente."
    });
    return;
  }

  res.status(200).json({
    worked: true,
    detail: "QR Code do WhatsApp",
    qrCode: qrText,
    qrImage: qrImage,
    instructions: "Escaneie este QR Code com seu WhatsApp para conectar"
  });
});

app.get("/qr/image", (req: Request, res: Response) => {
  const qrImage = whatsappService.getQRCodeImage();
  
  if (!qrImage) {
    res.status(404).json({
      worked: false,
      detail: "QR Code não disponível"
    });
    return;
  }

  // Remove o prefixo data:image/png;base64, se existir
  const base64Data = qrImage.replace(/^data:image\/png;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', imageBuffer.length);
  res.send(imageBuffer);
});

app.post("/send-text", async (req: Request, res: Response) => {
  const { message, number, image } = req.body;
  const withPreview = req.query['with-preview'] === 'true';
  console.log("\n=========================================\n");
  console.log(`Mensagem: ${message.substring(0, 20)}${message && message.length > 50 ? '...' : ''}`);
  console.log(`Número: ${number}`);
  console.log(`Imagem: ${image ? 'Sim' : 'Não'}`);
  console.log(`Com Preview: ${withPreview ? 'Sim' : 'Não'}`);

  if (!message || !number) {
    res.status(400).json({
      worked: false,
      detail: "Parâmetros inválidos! Siga o exemplo abaixo",
      example: {
        message: "Olá, tudo bem?",
        number: "5511999999999",
      },
    });
    return;
  }

  if (!whatsappService.getConnectionStatus()) {
    res.status(503).json({
      worked: false,
      detail: "WhatsApp não está conectado!",
      message,
      number,
    });
    return;
  }

  try {
    let chatId: string;
    
    // Verifica se é um grupo
    if (PhoneValidator.isGroupId(number)) {
      chatId = number;
      console.log(`Número recebido é um grupo: ${number}`);
      
      try {
        const group = await whatsappService.getGroupInfo(number);
        if (!group?.name) {
          res.status(400).json({
            worked: false,
            detail: "O número informado é um grupo inválido!",
            response: null,
            message,
            number,
          });
          return;
        }
      } catch (error) {
        console.error(`Erro ao obter informações do grupo, tentando enviar mesmo assim: ${error}`);
      }
    } else {
      // Valida e formata o número
      const phoneValidation = PhoneValidator.validateAndFormat(number);
      if (!phoneValidation.isValid) {
        res.status(400).json({
          worked: false,
          detail: phoneValidation.error,
          message,
          number,
        });
        return;
      }
      
      chatId = PhoneValidator.toChatId(phoneValidation.formatted!);
      
      // Verifica se o número tem WhatsApp
      const numberCheck = await whatsappService.checkNumberExists(phoneValidation.formatted!);
      if (!numberCheck.exists) {
        console.log(`Usuário ${chatId} não possui WhatsApp!`);
        res.status(400).json({
          worked: false,
          detail: "O número informado não possui WhatsApp!",
          response: numberCheck,
          message,
          number,
        });
        return;
      }
      console.log('numberCheck', numberCheck);
    }

    let success = false;

    try {
      if (image) {
        // Se é uma URL de imagem, baixa primeiro
        if (image.startsWith('http')) {
          const response = await axios.get(image, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data);
          success = await whatsappService.sendImageWithCaption(chatId, imageBuffer, message);
        } else {
          // Assume que é um buffer ou base64
          const imageBuffer = Buffer.isBuffer(image) ? image : Buffer.from(image, 'base64');
          success = await whatsappService.sendImageWithCaption(chatId, imageBuffer, message);
        }
      } else {
        success = await whatsappService.sendMessage(chatId, message, withPreview);
      }
    } catch (error) {
      console.error(`Erro ao enviar mensagem: ${error}`);
    }

    if (!success) {
      console.log(`Erro ao enviar mensagem para ${chatId}!`);
      res.status(400).json({
        worked: false,
        detail: "Erro ao enviar mensagem!",
        message,
        number,
      });
    } else {
      console.log(`Mensagem enviada com sucesso para ${chatId}!`);
      res.status(200).json({
        worked: true,
        detail: "Mensagem enviada com sucesso!",
        message,
        number,
      });
    }
  } catch (error) {
    console.error('Erro geral:', error);
    res.status(500).json({
      worked: false,
      detail: "Erro interno do servidor",
      error: error instanceof Error ? error.message : String(error),
      message,
      number,
    });
  }
});

app.get("/groups", async (req: Request, res: Response) => {
  if (!whatsappService.getConnectionStatus()) {
    res.status(503).json({
      worked: false,
      detail: "WhatsApp não está conectado!",
    });
    return;
  }

  try {
    const groups = await whatsappService.getGroups();
    res.status(200).json({
      worked: true,
      detail: "Grupos obtidos com sucesso!",
      response: groups,
    });
  } catch (error) {
    console.error('Erro ao obter grupos:', error);
    res.status(500).json({
      worked: false,
      detail: "Erro ao obter grupos",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

whatsappService.onAnyMessage((message: WAMessage) => {
  if (message.key.remoteJid === 'status@broadcast') return; // Ignora mensagens de status
  if (!message.message) return; // Ignora mensagens sem conteúdo
  if (message.key.fromMe) return; // Ignora mensagens enviadas pelo próprio bot
  if (message.message.reactionMessage) return; // Ignora reações
  console.log("\n=========================================\n");

  // Handle image and video messages to extract caption
  const {imageMessage, videoMessage, extendedTextMessage} = message.message;
  
  if (imageMessage) {
    message.message.conversation = imageMessage.caption || '';
  }

  if (videoMessage) {
    message.message.conversation = videoMessage.caption || '';
  }
  
  if (extendedTextMessage && !message.message.conversation) {
    message.message.conversation = extendedTextMessage.text || '';
  }

  // Send post request
  axios.post(`https://milhascomia.noclaf.com.br/core/log-message/`, message)
    .then(response => {
      console.log('Mensagem enviada ao servidor!');
    })
    .catch(error => {
      console.error('Erro ao salvar mensagem:', error?.response?.data?.error);

      // Função para remover referências circulares
      function safeStringify(obj: any) {
        const seen = new WeakSet();
        return JSON.stringify(obj, function(key, value) {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
              return undefined;
            }
            seen.add(value);
          }
          return value;
        }, 2);
      }

      // Salva o erro em arquivo JSON (evitando referências circulares)
      const errorLog = {
        timestamp: new Date().toISOString(),
        sentObject: message,
        errorResponse: {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          headers: error?.response?.headers,
          message: error?.message,
          code: error?.code
        }
      };

      try {
        fs.writeFileSync('./message-error.json', safeStringify(errorLog));
        console.log('Erro salvo em message-error.json');
      } catch (writeError) {
        console.error('Erro ao salvar arquivo de erro:', writeError);
      }
    });
});