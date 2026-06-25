import { Link } from 'react-router';

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--color-black)]">
      {/* Fundo bem transparente */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <img
          src="/assets/login.jpg"
          alt=""
          className="h-full w-full object-cover opacity-[0.12]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(233,30,99,0.10) 0%, transparent 60%), linear-gradient(to bottom, rgba(10,10,10,0.6), rgba(10,10,10,0.9))',
          }}
        />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex justify-center">
            <img src="/assets/logo-mirian.png" alt="Mirian Barreto" className="h-28 w-auto md:h-32" />
          </Link>

          <div
            className="rounded-2xl p-8 md:p-10"
            style={{ background: 'white', border: '1px solid var(--color-divider-dark)' }}
          >
            <h1
              className="font-semibold text-[var(--color-black)]"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}
            >
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-sm text-[var(--color-medium-grey)]">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-[rgba(255,255,255,0.85)]">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
