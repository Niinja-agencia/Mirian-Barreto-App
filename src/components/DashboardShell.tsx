import { useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router';
import { Menu, X, LogOut, ArrowLeftRight, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export default function DashboardShell({
  nav,
  areaLabel,
  children,
}: {
  nav: NavItem[];
  areaLabel: string;
  children: React.ReactNode;
}) {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // A Mirian é admin e também quer ver o app como as alunas veem. Sem este
  // atalho, ir de uma área para a outra exigia digitar a URL na mão.
  const naAreaAdmin = location.pathname.startsWith('/admin');
  const trocarPara = naAreaAdmin
    ? { to: '/app', label: 'Ver como aluna' }
    : { to: '/admin', label: 'Painel de administração' };

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Aluna';

  const navContent = (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-rose)] text-white'
                  : 'text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[var(--color-warm-grey)]">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[var(--color-black)] p-5 md:flex">
        <img src="/assets/logo-mirian.png" alt="Mirian Barreto" className="h-12 w-auto mb-2 self-start" />
        <span className="mb-8 text-xs uppercase tracking-[0.12em] text-[var(--color-medium-grey)]">
          {areaLabel}
        </span>
        {navContent}
        <div className="mt-auto flex flex-col gap-1 border-t border-[rgba(255,255,255,0.08)] pt-3">
          {isAdmin && (
            <Link
              to={trocarPara.to}
              className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.7)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
            >
              <ArrowLeftRight size={18} /> {trocarPara.label}
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.7)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[var(--color-black)] px-4 py-3 md:hidden">
        <img src="/assets/logo-mirian.png" alt="Mirian Barreto" className="h-10 w-auto" />
        <button onClick={() => setOpen(true)} className="text-white p-2" aria-label="Abrir menu">
          <Menu size={24} />
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-[var(--color-black)] p-5 flex flex-col">
            <button
              onClick={() => setOpen(false)}
              className="self-end text-white p-2"
              aria-label="Fechar menu"
            >
              <X size={24} />
            </button>
            <span className="mb-6 text-xs uppercase tracking-[0.12em] text-[var(--color-medium-grey)]">
              {areaLabel}
            </span>
            {navContent}
            <div className="mt-auto flex flex-col gap-1">
              {isAdmin && (
                <Link
                  to={trocarPara.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.7)] hover:text-white"
                >
                  <ArrowLeftRight size={18} /> {trocarPara.label}
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.7)] hover:text-white"
              >
                <LogOut size={18} /> Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
          <div className="mb-6 hidden items-center gap-3 md:flex">
            <Avatar url={profile?.avatar_url} name={firstName} size={44} />
            <div>
              <p className="text-sm text-[var(--color-medium-grey)]">Olá,</p>
              <p className="text-lg font-semibold text-[var(--color-black)]">{firstName} 👋</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
