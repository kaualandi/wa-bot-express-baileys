# 📱 Teste da API de QR Code - WhatsApp Bot

## 🎯 APIs Implementadas

### 1. `GET /qr` - Obter QR Code (JSON)

**Resposta quando QR está disponível:**
```json
{
  "worked": true,
  "detail": "QR Code do WhatsApp",
  "qrCode": "2@BVqI8VjQDyGjHoRw...",
  "qrImage": "data:image/png;base64,iVBORw0KGgoAAA...",
  "instructions": "Escaneie este QR Code com seu WhatsApp para conectar"
}
```

**Resposta quando QR não está disponível:**
```json
{
  "worked": false,
  "detail": "QR Code não disponível",
  "reason": "WhatsApp já está conectado"
}
```

### 2. `GET /qr/image` - Obter QR Code (Imagem PNG)

Retorna diretamente a imagem PNG do QR Code.

### 3. `GET /status` - Status com informação de QR

**Resposta:**
```json
{
  "worked": true,
  "detail": "Status do WhatsApp",
  "connected": false,
  "number": null,
  "hasQR": true
}
```

## 🧪 Testes com cURL

### 1. Verificar se QR Code está disponível:
```bash
curl http://localhost:3000/status
```

### 2. Obter QR Code (JSON):
```bash
curl http://localhost:3000/qr
```

### 3. Baixar QR Code como imagem:
```bash
curl http://localhost:3000/qr/image -o qrcode.png
```

### 4. Obter QR Code em base64:
```bash
curl -s http://localhost:3000/qr | jq -r '.qrImage'
```

## 🌐 Teste Visual

Abra o arquivo `qr-example.html` no navegador:

```bash
# Inicie o servidor
npm start

# Em outro terminal, abra o arquivo HTML
open qr-example.html
# ou no Windows:
# start qr-example.html
# ou no Linux:
# xdg-open qr-example.html
```

## 📱 Integrações

### JavaScript/Frontend:
```javascript
// Verificar se QR está disponível
const status = await fetch('http://localhost:3000/status').then(r => r.json());
if (status.hasQR) {
    // Obter QR Code
    const qr = await fetch('http://localhost:3000/qr').then(r => r.json());
    document.getElementById('qr-image').src = qr.qrImage;
}
```

### React/Vue/Angular:
```javascript
// Hook/Component para monitorar QR
useEffect(() => {
    const interval = setInterval(async () => {
        const status = await fetch('/status').then(r => r.json());
        if (status.connected) {
            setConnected(true);
            setQrCode(null);
        } else if (status.hasQR) {
            const qr = await fetch('/qr').then(r => r.json());
            setQrCode(qr.qrImage);
        }
    }, 3000);
    
    return () => clearInterval(interval);
}, []);
```

### Python:
```python
import requests
import base64

# Obter QR Code
response = requests.get('http://localhost:3000/qr')
if response.status_code == 200:
    data = response.json()
    if data['worked']:
        # Salvar imagem
        qr_data = data['qrImage'].replace('data:image/png;base64,', '')
        with open('qrcode.png', 'wb') as f:
            f.write(base64.b64decode(qr_data))
```

### PHP:
```php
<?php
// Obter QR Code
$response = file_get_contents('http://localhost:3000/qr');
$data = json_decode($response, true);

if ($data['worked']) {
    $qr_data = str_replace('data:image/png;base64,', '', $data['qrImage']);
    file_put_contents('qrcode.png', base64_decode($qr_data));
}
?>
```

## 🔄 Fluxo Completo

```bash
# 1. Iniciar servidor
npm start

# 2. Verificar status (deve mostrar hasQR: false inicialmente)
curl http://localhost:3000/status

# 3. Aguardar QR Code ser gerado (alguns segundos)
sleep 5

# 4. Verificar se QR está disponível
curl http://localhost:3000/status

# 5. Obter QR Code
curl http://localhost:3000/qr

# 6. Escanear QR Code com WhatsApp

# 7. Verificar se conectou
curl http://localhost:3000/status
```

## 🎨 Interface Visual

O arquivo `qr-example.html` fornece uma interface completa com:

- ✅ **Status em tempo real** da conexão
- 📱 **QR Code visual** atualizado automaticamente  
- 📋 **Instruções** de como escanear
- 🔄 **Atualização automática** a cada 3 segundos
- 📊 **Informações** da conexão quando conectado

## 🚀 Vantagens

### ✅ **Flexibilidade:**
- JSON para integrações
- Imagem PNG direta
- Interface web pronta

### ✅ **Tempo Real:**
- QR Code sempre atualizado
- Status de conexão em tempo real
- Limpeza automática quando conecta

### ✅ **Fácil Integração:**
- APIs RESTful simples
- Formatos múltiplos (JSON/PNG)
- Documentação completa

---

**🎉 Agora você pode exibir o QR Code em qualquer interface web, aplicativo mobile ou sistema que preferir!**
