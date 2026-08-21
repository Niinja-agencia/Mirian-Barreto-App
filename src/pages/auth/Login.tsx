import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import AuthShell from '@/components/AuthShell';
import { TextInput, SubmitButton } from '@/components/form';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { signIn, session, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Quando a pessoa foi barrada numa rota, volta para ela; senão, cada uma
  // para a sua casa. Antes ia sempre para /app, e a Mirian caía na área da
  // aluna, sem plano, com todos os treinos marcados como bloqueados — o painel
  // de administração existia mas nada levava até ele.
  const from = (location.state as { from?: string } | null)?.from ?? null;

  useEffect(() => {
    if (!session) return;
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    // Espera o perfil chegar para saber se é admin.
    if (!profile) return;
    navigate(isAdmin ? '/admin' : '/app', { replace: true });
  }, [session, profile, isAdmin, navigate, from]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Bem-vinda de volta!');
    // Para onde ir é decidido num lugar só, no efeito acima — ele espera o
    // perfil chegar para saber se manda para o painel ou para a área da aluna.
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse seus treinos e acompanhe sua evolução."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="text-[var(--color-rose)] font-medium hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <TextInput
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <TextInput
            label="Senha"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 text-right">
            <Link
              to="/recuperar-senha"
              className="text-xs text-[var(--color-medium-grey)] hover:text-[var(--color-rose)]"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>
        <SubmitButton loading={loading}>Entrar</SubmitButton>
      </form>
    </AuthShell>
  );
}
