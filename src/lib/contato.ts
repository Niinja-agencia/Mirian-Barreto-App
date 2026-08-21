// Contato da Mirian, em um lugar só.
//
// O número estava fixo em quatro arquivos, embora o .env.example já
// documentasse VITE_WHATSAPP_NUMBER — trocar de número exigia mexer no código.
// O valor do .env vence; o literal abaixo é só a rede de segurança para o caso
// de a variável não estar definida na Vercel.

const PADRAO = '553141122199';

/** Só dígitos, no formato internacional (ex.: 553141122199). */
export const WHATSAPP_NUMBER: string =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, '') || PADRAO;

/** "553141122199" -> "31 4112-2199" (para exibir na tela). */
export function whatsappDisplay(numero: string = WHATSAPP_NUMBER): string {
  const nacional = numero.replace(/\D/g, '').replace(/^55/, '');
  const ddd = nacional.slice(0, 2);
  const resto = nacional.slice(2);
  if (resto.length === 9) return `${ddd} ${resto.slice(0, 5)}-${resto.slice(5)}`;
  if (resto.length === 8) return `${ddd} ${resto.slice(0, 4)}-${resto.slice(4)}`;
  return numero;
}

/** Link do WhatsApp, opcionalmente com mensagem pronta. */
export function whatsappLink(mensagem?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
