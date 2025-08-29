export const BaileysConfig = {
  browser: ['WhatsApp Bot Express', 'Chrome', '1.0.0'] as [string, string, string],
  printQRInTerminal: false, // Controlamos manualmente o QR
  generateHighQualityLinkPreview: true,
  markOnlineOnConnect: true,
  syncFullHistory: false,
  defaultQueryTimeoutMs: 60000,
  
  // Configurações de reconexão
  retryRequestDelayMs: 250,
  maxMsgRetryCount: 5,
  
  // Configurações de auth
  authDir: './auth_info',
  
  // Configurações de log
  logLevel: 'error' as const,
  
  // Configurações de mensagem
  getMessage: async (key: any) => {
    return {
      conversation: 'Mensagem não encontrada'
    };
  }
};

export default BaileysConfig;
