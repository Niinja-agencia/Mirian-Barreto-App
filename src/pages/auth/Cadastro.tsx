import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import AuthShell from '@/components/AuthShell';
import { TextInput, SubmitButton } from '@/components/form';
import { useAuth } from '@/context/AuthContext';
import { authPath, checkoutDestination } from '@/lib/authRedirect';

export default function Cadastro() {
  const { signUp, session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = checkoutDestination(searchParams.get('next'));
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setLoading(true);
    const { error, needsEmailConfirmation } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      next,
    });
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (needsEmailConfirmation) {
      toast.success('Conta criada! Confirme seu e-mail e entre para concluir a assinatura.');
      navigate(authPath('login', next), { replace: true });
    } else {
      navigate(next ?? '/app', { replace: true });
    }
  }

  if (session) return <Navigate to={next ?? '/app'} replace />;

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Comece sua transformação com a Mirian."
      footer={
        <>
          Já tem conta?{' '}
          <Link to={authPath('login', next)} className="text-[var(--color-rose)] font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <TextInput
          label="Nome completo"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <TextInput
          label="WhatsApp (opcional)"
          type="tel"
          placeholder="(31) 9 9999-9999"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextInput
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextInput
          label="Senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Mínimo de 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <SubmitButton loading={loading}>Criar conta</SubmitButton>
      </form>
    </AuthShell>
  );
}
