/**
 * Striped stand-in for imagery we do not have yet. Always labelled in DM Mono
 * with what belongs there — never an empty box.
 */
export default function Placeholder({
  label,
  className = '',
  round = false,
}: {
  label: string;
  className?: string;
  round?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`${round ? 'ph-stripe-sm' : 'ph-stripe'} flex items-center justify-center text-center ${className}`}
    >
      <span className="mono-label px-3">{label}</span>
    </div>
  );
}
