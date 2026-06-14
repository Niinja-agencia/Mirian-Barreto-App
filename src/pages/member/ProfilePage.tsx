import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { TextInput, SubmitButton } from '@/components/form';
import { LEVEL_LABELS } from '@/lib/format';
import type { FitnessLevel } from '@/lib/database.types';

export default function ProfilePage() {
  const { user, profile, updatePassword, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState<FitnessLevel>('iniciante');
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setLevel(profile.level);
    }
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null, level })
      .eq('id', user.id);
    setSavingProfile(false);
    if (error) {
      toast.error('Erro ao salvar. Tente novamente.');
      return;
    }
    await refreshProfile();
    toast.success('Dados atualizados!');
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirm) return toast.error('As senhas não conferem.');
    setSavingPwd(true);
    const { error } = await updatePassword(password);
    setSavingPwd(false);
    if (error) return toast.error(error);
    setPassword('');
    setConfirm('');
    toast.success('Senha alterada com sucesso!');
  }

  return (
    <div className="max-w-xl space-y-8">
      <h1
        className="text-[var(--color-black)] font-semibold"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}
      >
        Perfil
      </h1>

      {/* Dados pessoais */}
      <form
        onSubmit={saveProfile}
        className="space-y-5 rounded-2xl bg-white p-6"
        style={{ border: '1px solid var(--color-divider-dark)' }}
      >
        <h2 className="font-semibold text-[var(--color-black)]">Dados pessoais</h2>
        <TextInput label="E-mail" value={user?.email ?? ''} disabled readOnly />
        <TextInput label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <TextInput label="WhatsApp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">Nível</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as FitnessLevel)}
            className="w-full rounded-lg border border-[var(--color-divider-dark)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-black)]"
          >
            {Object.entries(LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton loading={savingProfile}>Salvar alterações</SubmitButton>
      </form>

      {/* Senha */}
      <form
        onSubmit={changePassword}
        className="space-y-5 rounded-2xl bg-white p-6"
        style={{ border: '1px solid var(--color-divider-dark)' }}
      >
        <h2 className="font-semibold text-[var(--color-black)]">Trocar senha</h2>
        <TextInput
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <TextInput
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <SubmitButton loading={savingPwd}>Alterar senha</SubmitButton>
      </form>
    </div>
  );
}
