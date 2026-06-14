import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import AuthShell from '@/components/AuthShell';
import { TextInput, SubmitButton } from '@/components/form';
import { useAuth } from '@/context/AuthContext';

export default function RedefinirSenha() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não conferem.');
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Senha atualizada com sucesso!');
    navigate('/app', { replace: true });
  }

  return (
    <AuthShell title="Definir nova senha" subtitle="Escolha uma senha nova para sua conta.">
      <form onSubmit={onSubmit} className="space-y-5">
        <TextInput
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextInput
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <SubmitButton loading={loading}>Salvar senha</SubmitButton>
      </form>
    </AuthShell>
  );
}
