import { Outlet } from 'react-router';
import { BarChart3, Dumbbell, FolderTree, CreditCard, Users, Megaphone } from 'lucide-react';
import DashboardShell, { type NavItem } from '@/components/DashboardShell';

const nav: NavItem[] = [
  { to: '/admin', label: 'Visão geral', icon: BarChart3, end: true },
  { to: '/admin/treinos', label: 'Treinos', icon: Dumbbell },
  { to: '/admin/categorias', label: 'Categorias', icon: FolderTree },
  { to: '/admin/planos', label: 'Planos', icon: CreditCard },
  { to: '/admin/alunas', label: 'Alunas', icon: Users },
  { to: '/admin/avisos', label: 'Avisos', icon: Megaphone },
];

export default function AdminLayout() {
  return (
    <DashboardShell nav={nav} areaLabel="Administração">
      <Outlet />
    </DashboardShell>
  );
}
