import { Outlet } from 'react-router';
import { LayoutDashboard, Dumbbell, TrendingUp, CreditCard, User } from 'lucide-react';
import DashboardShell, { type NavItem } from '@/components/DashboardShell';
import InstallPrompt from '@/components/InstallPrompt';

const nav: NavItem[] = [
  { to: '/app', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/app/treinos', label: 'Treinos', icon: Dumbbell },
  { to: '/app/progresso', label: 'Meu progresso', icon: TrendingUp },
  { to: '/app/assinatura', label: 'Minha assinatura', icon: CreditCard },
  { to: '/app/perfil', label: 'Perfil', icon: User },
];

export default function MemberLayout() {
  return (
    <DashboardShell nav={nav} areaLabel="Área da Aluna">
      <Outlet />
      <InstallPrompt />
    </DashboardShell>
  );
}
