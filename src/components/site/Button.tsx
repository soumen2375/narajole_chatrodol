import { Link } from 'react-router-dom';
import type { ComponentProps, ReactNode } from 'react';

export type ButtonVariant =
  | 'yellow'
  | 'green'
  | 'blood'
  | 'ghost-light'
  | 'ghost-dark'
  | 'tertiary';

const VARIANT: Record<ButtonVariant, string> = {
  yellow: 'btn-yellow',
  green: 'btn-green',
  blood: 'btn-blood',
  'ghost-light': 'btn-ghost-light',
  'ghost-dark': 'btn-ghost-dark',
  tertiary: 'btn-tertiary',
};

type Common = { variant?: ButtonVariant; className?: string; children: ReactNode };

/** Internal route button. */
export function ButtonLink({
  to,
  variant = 'yellow',
  className = '',
  children,
  ...rest
}: Common & { to: string } & Omit<ComponentProps<typeof Link>, 'to' | 'className' | 'children'>) {
  return (
    <Link to={to} className={`${VARIANT[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

/** External / mailto / tel button. */
export function ButtonAnchor({
  variant = 'yellow',
  className = '',
  children,
  ...rest
}: Common & ComponentProps<'a'>) {
  return (
    <a className={`${VARIANT[variant]} ${className}`} {...rest}>
      {children}
    </a>
  );
}

/** Form / action button. */
export default function Button({
  variant = 'yellow',
  className = '',
  type = 'button',
  children,
  ...rest
}: Common & ComponentProps<'button'>) {
  return (
    <button type={type} className={`${VARIANT[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
