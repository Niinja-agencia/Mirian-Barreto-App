import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { TextInput, SelectInput, SubmitButton } from '@/components/form';
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
    <div className="space-y-6">
      <div>
        <h1
          className="font-semibold text-[var(--color-black)]"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2rem)' }}
        >
          Perfil
        </h1>
        <p className="mt-1 text-sm text-[var(--color-medium-grey)]">
          Seus dados e o acesso à conta.
        </p>
      </div>

      {/* Duas colunas no desktop: os cartões deixam de ficar empilhados numa
          coluna estreita com meia tela vazia ao lado. */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Dados pessoais */}
        <form
          onSubmit={saveProfile}
          className="rounded-2xl border border-[var(--color-border)] bg-white p-6"
        >
          <h2 className="text-base font-semibold text-[var(--color-black)]">Dados pessoais</h2>

          <div className="mt-5 space-y-4">
            <TextInput
              label="E-mail"
              value={user?.email ?? ''}
              disabled
              readOnly
              hint="O e-mail de acesso não pode ser alterado por aqui."
            />
            <TextInput
              label="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <TextInput
              label="WhatsApp"
              type="tel"
              placeholder="(31) 90000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <SelectInput
              label="Nível"
              value={level}
              onChange={(e) => setLevel(e.target.value as FitnessLevel)}
            >
              {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </SelectInput>
          </div>

          <div className="mt-6 flex justify-end border-t border-[var(--color-border)] pt-5">
            <SubmitButton loading={savingProfile} block={false}>
              Salvar alterações
            </SubmitButton>
          </div>
        </form>

        {/* Senha */}
        <form
          onSubmit={changePassword}
          className="rounded-2xl border border-[var(--color-border)] bg-white p-6"
        >
          <h2 className="text-base font-semibold text-[var(--color-black)]">Trocar senha</h2>

          <div className="mt-5 space-y-4">
            <TextInput
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              hint="Pelo menos 6 caracteres."
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
          </div>

          {/* Secundário: trocar senha é ação eventual, não compete com salvar. */}
          <div className="mt-6 flex justify-end border-t border-[var(--color-border)] pt-5">
            <SubmitButton loading={savingPwd} variant="secondary" block={false}>
              Alterar senha
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
