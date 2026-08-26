import type { ComponentProps, ReactNode } from 'react';

/**
 * Pill toggle used for event filters, blood groups, donation amounts and
 * volunteer interests. Off = white with green text, on = solid green.
 * Blood-group chips swap green for --blood.
 */
export default function Chip({
  active = false,
  tone = 'green',
  className = '',
  children,
  ...rest
}: {
  active?: boolean;
  tone?: 'green' | 'blood';
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<'button'>, 'className' | 'children'>) {
  const on = tone === 'blood' ? 'chip-blood-on' : 'chip-on';
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`chip ${active ? on : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
