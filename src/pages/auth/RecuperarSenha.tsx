import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import AuthShell from '@/components/AuthShell';
import { TextInput, SubmitButton } from '@/components/form';
import { useAuth } from '@/context/AuthContext';

export default function RecuperarSenha() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link para você redefinir sua senha."
      footer={
        <Link to="/login" className="text-[var(--color-rose)] font-medium hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-[var(--color-black)]">
          Se existir uma conta com esse e-mail, você receberá um link em instantes. Confira também a
          caixa de spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <TextInput
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <SubmitButton loading={loading}>Enviar link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
