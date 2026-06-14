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
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-black)] px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8">
          <img src="/assets/logo-mirian.png" alt="Mirian Barreto" className="h-16 w-auto" />
        </Link>

        <div
          className="rounded-2xl p-8 md:p-10"
          style={{ background: 'white', border: '1px solid var(--color-divider-dark)' }}
        >
          <h1
            className="text-[var(--color-black)] font-semibold"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-[var(--color-medium-grey)]">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-[var(--color-medium-grey)]">{footer}</div>
        )}
      </div>
    </div>
  );
}
