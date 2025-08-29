# WhatsApp Bot Express - Baileys Edition �

<p align="center">
<img alt="Versão" src="https://img.shields.io/badge/version-2.0-blue.svg?cacheSeconds=2592000" />
<img alt="Licença: APACHE 2.0" src="https://img.shields.io/badge/License-APACHE 2.0-yellow.svg" />
<img alt="Baileys" src="https://img.shields.io/badge/Baileys-WebSocket-green"/>
<img alt="node-version" src="https://img.shields.io/badge/node-%3E%3D16-brightgreen"/>
<img alt="made-with-typescript" src="https://img.shields.io/badge/Made%20with-TypeScript-blue.svg"/>
</p>

> Bot do WhatsApp construído com Express.js e Baileys (WebSocket) para envio de mensagens através de API REST.

## 🚀 **MIGRAÇÃO CONCLUÍDA: wa-automate → Baileys**

### ✅ **O que mudou:**
- **Biblioteca**: `@open-wa/wa-automate` → `@whiskeysockets/baileys`
- **Conexão**: Puppeteer/Chrome → WebSocket nativo (mais estável e rápido)
- **Autenticação**: Arquivo único → Multi-file auth state
- **Performance**: Redução significativa no uso de recursos

## 📦 Instalação

```bash
git clone https://github.com/kaualandi/wa-bot-express.git
cd wa-bot-express
```

```bash
npm install
```

## 🔧 Configuração

### Variáveis de ambiente (opcional)

Crie um arquivo `.env`:

```env
PORT=3000
```

- **PORT:** Define a porta do servidor (padrão: 80)

## 🚀 Execução

```bash
npm start
```

**Na primeira execução:**
1. Um QR Code aparecerá no terminal
2. Escaneie com seu WhatsApp
3. A conexão será salva automaticamente em `auth_info/`

## 📚 API Endpoints

### GET `/` - Status do servidor
```json
{
  "worked": true,
  "detail": "Servidor funcionando!",
  "whatsappConnected": true
}
```

### GET `/status` - Status detalhado
```json
{
  "worked": true,
  "detail": "Status do WhatsApp",
  "connected": true,
  "number": "5511999999999"
}
```

### POST `/send-text` - Enviar mensagem

**Request:**
```json
{
  "number": "5511999999999",
  "message": "Olá, tudo bem?",
  "image": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "worked": true,
  "detail": "Mensagem enviada com sucesso!",
  "message": "Olá, tudo bem?",
  "number": "5511999999999"
}
```

### GET `/groups` - Listar grupos
```json
{
  "worked": true,
  "detail": "Grupos obtidos com sucesso!",
  "response": [
    {
      "id": "123456789@g.us",
      "name": "Meu Grupo",
      "participants": 10
    }
  ]
}
```

## ⚠️ Mudanças Importantes

### Formato de números:
- **Antes**: `5511999999999@c.us`
- **Agora**: `5511999999999@s.whatsapp.net` (automático)

### Autenticação:
- **Antes**: Arquivo `.data.json`
- **Agora**: Pasta `auth_info/` (multi-arquivo)

### Performance:
- ✅ Sem Chrome/Puppeteer
- ✅ Conexão WebSocket nativa
- ✅ Menor uso de recursos
- ✅ Mais estável

## 🔧 Scripts

- `npm start` - Desenvolvimento com nodemon
- `npm run build` - Compilar TypeScript
- `npm run start:prod` - Produção
```

Escaneie o QR Code como se estivesse conectando ao whatsapp web e dê _send_ na requisição.

> Não se esqueça de verificar se o multidevices (Multiplos Dispositivos) está ativado em seu whatsapp.
