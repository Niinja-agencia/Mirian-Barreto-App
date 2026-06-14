import { Outlet } from 'react-router';
import { LayoutDashboard, Dumbbell, TrendingUp, CreditCard, User } from 'lucide-react';
import DashboardShell, { type NavItem } from '@/components/DashboardShell';

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
    </DashboardShell>
  );
}
