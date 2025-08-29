export class PhoneValidator {
  /**
   * Valida e formata um número de telefone brasileiro
   */
  static validateAndFormat(phone: string): { isValid: boolean; formatted?: string; error?: string } {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verifica se é um número válido
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      return {
        isValid: false,
        error: 'Número deve ter entre 10 e 13 dígitos'
      };
    }
    
    let formattedPhone = cleanPhone;
    
    // Adiciona código do país se não tiver
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }
    
    // Verifica se tem o formato correto (55 + DDD + número)
    if (formattedPhone.length !== 13 && formattedPhone.length !== 12) {
      return {
        isValid: false,
        error: 'Formato de número inválido'
      };
    }
    
    return {
      isValid: true,
      formatted: formattedPhone
    };
  }

  /**
   * Converte número para formato de chat ID do WhatsApp
   */
  static toChatId(phone: string, isGroup: boolean = false): string {
    if (isGroup) {
      return phone.endsWith('@g.us') ? phone : `${phone}@g.us`;
    }
    
    const { formatted } = this.validateAndFormat(phone);
    return `${formatted}@s.whatsapp.net`;
  }

  /**
   * Verifica se é um ID de grupo
   */
  static isGroupId(chatId: string): boolean {
    return chatId.endsWith('@g.us');
  }
}
