import { Request, Response } from "express";
import express from "express";
import axios from "axios";

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
  });
});

app.post("/send-text", async (req: Request, res: Response) => {
  const { message, number, image } = req.body;
  
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
        success = await whatsappService.sendMessage(chatId, message);
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
