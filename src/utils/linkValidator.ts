export class LinkValidator {
	static urlPattern: RegExp = /((https?:\/\/)?(www\.)?[\w-]+(\.[\w-]+)+([\/\w\-.?=&%+]*)?)/i;

	/**
	 * Verifica se o texto contém um link
	 * @param text O texto a ser verificado
	 * @return true se o texto contém um link, false caso contrário
	 */
	static containsLink(text: string): boolean {
		return this.urlPattern.test(text);
	}

	/**
	 * Extrai o primeiro link encontrado no texto
	 * @param text O texto do qual extrair o link
	 * @return O link encontrado ou null se nenhum link for encontrado
	 */
	static extractFirstLink(text: string): string | null {
		const match = text.match(this.urlPattern);
		return match ? match[0] : null;
	}
}