# Teste da API - WhatsApp Bot Express (Baileys)

## Testando com cURL

### 1. Verificar status do servidor
```bash
curl -X GET http://localhost:3000/
```

### 2. Verificar status do WhatsApp
```bash
curl -X GET http://localhost:3000/status
```

### 3. Enviar mensagem de texto
```bash
curl -X POST http://localhost:3000/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste do bot migrado para Baileys!"
  }'
```

### 4. Enviar mensagem com imagem
```bash
curl -X POST http://localhost:3000/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "message": "Aqui está uma imagem!",
    "image": "https://via.placeholder.com/300x200.png?text=Teste"
  }'
```

### 5. Enviar para grupo
```bash
curl -X POST http://localhost:3000/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "number": "123456789@g.us",
    "message": "Mensagem para o grupo!"
  }'
```

### 6. Listar grupos
```bash
curl -X GET http://localhost:3000/groups
```

## Testando com JavaScript (fetch)

```javascript
// Enviar mensagem
const response = await fetch('http://localhost:3000/send-text', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    number: '5511999999999',
    message: 'Olá do JavaScript!'
  })
});

const result = await response.json();
console.log(result);
```

## Comando ping/pong

Envie `!ping` para qualquer chat conectado e o bot responderá com `Pong! 🏓`
