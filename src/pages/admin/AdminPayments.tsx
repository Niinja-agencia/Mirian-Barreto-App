import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Unplug } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import FullScreenLoader from '@/components/FullScreenLoader';

interface Status {
  conectado: boolean;
  provider: string;
  mp_user_id: string | null;
  nickname: string | null;
  email: string | null;
  live_mode: boolean | null;
  connected_at: string | null;
  expira_em: string | null;
}

/** Recados que o callback do Mercado Pago devolve na querystring. */
const RECADOS: Record<string, string> = {
  conectado: 'Conta do Mercado Pago conectada.',
  'erro:resposta-incompleta': 'O Mercado Pago voltou sem os dados esperados. Tente de novo.',
  'erro:app-nao-configurado': 'Faltam as credenciais do aplicativo no servidor.',
  'erro:state-invalido': 'Esta autorização não corresponde a nenhum pedido feito aqui.',
  'erro:state-expirado': 'O pedido expirou. Comece de novo.',
  'erro:troca-recusada': 'O Mercado Pago recusou a autorização.',
  'erro:falha-ao-guardar': 'A conta autorizou, mas não conseguimos guardar. Tente de novo.',
};

export default function AdminPayments() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [conectando, setConectando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('payment_connection_status');
    if (!error) setStatus((data as unknown as Status[])?.[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // O callback volta com ?mp=... — mostra o recado e limpa a URL.
  useEffect(() => {
    const mp = params.get('mp');
    if (!mp) return;
    const texto = RECADOS[mp] ?? (mp.startsWith('erro:') ? 'Não foi possível conectar.' : mp);
    if (mp === 'conectado') toast.success(texto);
    else toast.error(texto);
    params.delete('mp');
    setParams(params, { replace: true });
  }, [params, setParams]);

  async function conectar() {
    setConectando(true);
    const { data, error } = await supabase.functions.invoke('mp-oauth', {
      body: { action: 'start' },
    });
    setConectando(false);

    if (error || !data?.url) {
      toast.error(
        data?.error === 'app_nao_configurado'
          ? 'Faltam as credenciais do aplicativo no servidor.'
          : 'Não foi possível iniciar a conexão.'
      );
      return;
    }
    // Sai do app para o Mercado Pago; ele traz de volta para esta mesma tela.
    window.location.href = data.url as string;
  }

  async function desconectar() {
    if (
      !confirm(
        'Desconectar a conta do Mercado Pago? Novas assinaturas deixam de ser criadas até você conectar de novo. Quem já assina continua sendo cobrado normalmente.'
      )
    )
      return;
    setDesconectando(true);
    const { error } = await supabase.functions.invoke('mp-oauth', {
      body: { action: 'disconnect' },
    });
    setDesconectando(false);
    if (error) {
      toast.error('Não foi possível desconectar.');
      return;
    }
    toast.success('Conta desconectada.');
    carregar();
  }

  if (loading) return <FullScreenLoader />;

  const conectado = !!status?.conectado;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-black)]">Pagamentos</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-[var(--color-medium-grey)]">
          A conta conectada aqui é a que recebe o dinheiro das assinaturas. Nada de cartão passa
          por este site — quem cobra é o Mercado Pago.
        </p>
      </div>

      <div
        className="rounded-2xl bg-white p-6"
        style={{ border: '1px solid var(--color-divider-dark)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {conectado ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={22} />
            ) : (
              <AlertCircle className="mt-0.5 shrink-0 text-[var(--color-rose)]" size={22} />
            )}
            <div>
              <p className="font-semibold text-[var(--color-black)]">
                {conectado ? 'Mercado Pago conectado' : 'Nenhuma conta conectada'}
              </p>

              {conectado ? (
                <div className="mt-1 space-y-0.5 text-sm text-[var(--color-medium-grey)]">
                  {status?.nickname && <p>Conta: {status.nickname}</p>}
                  {status?.email && <p>{status.email}</p>}
                  {status?.connected_at && <p>Conectada em {formatDate(status.connected_at)}</p>}
                  {status?.live_mode === false && (
                    <p className="font-medium text-[var(--color-rose)]">
                      Modo de teste — nenhuma cobrança é real.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 max-w-[52ch] text-sm text-[var(--color-medium-grey)]">
                  Enquanto não houver conta conectada, as alunas não conseguem assinar.
                </p>
              )}
            </div>
          </div>

          {conectado ? (
            <button
              onClick={desconectar}
              disabled={desconectando}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-divider-dark)] px-4 py-2.5 text-sm font-medium text-[var(--color-black)] hover:border-[var(--color-rose)] hover:text-[var(--color-rose)] disabled:opacity-60"
            >
              {desconectando ? <Loader2 className="animate-spin" size={16} /> : <Unplug size={16} />}
              Desconectar
            </button>
          ) : (
            <button
              onClick={conectar}
              disabled={conectando}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-rose)] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] text-white hover:bg-[var(--color-rose-hover)] disabled:opacity-60"
            >
              {conectando ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <ExternalLink size={16} />
              )}
              Conectar Mercado Pago
            </button>
          )}
        </div>
      </div>

      <div
        className="rounded-2xl bg-[var(--color-warm-grey)] p-6 text-sm text-[var(--color-medium-grey)]"
        style={{ border: '1px solid var(--color-divider-dark)' }}
      >
        <p className="font-medium text-[var(--color-black)]">Como funciona</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Ao clicar em conectar, você vai para o Mercado Pago e entra com a conta que deve
            receber o dinheiro.
          </li>
          <li>
            O Mercado Pago pergunta se autoriza este aplicativo. Depois de aceitar, ele traz você
            de volta para cá.
          </li>
          <li>
            A autorização é guardada no servidor e renovada sozinha. A senha da sua conta não é
            compartilhada, e você pode desconectar a qualquer momento.
          </li>
        </ol>
        <p className="mt-4">
          Para receber por Pix, a conta precisa ter chave Pix cadastrada e o cadastro completo no
          Mercado Pago — sem isso, só cartão funciona.
        </p>
      </div>
    </div>
  );
}
