export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-[3px]" style={{ borderColor: '#e7e5e4' }} />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent" style={{ borderTopColor: '#c2410c' }} />
      </div>
      {label && (
        <p className="font-bengali text-[13.5px]" style={{ color: '#78716c', fontFamily: '"Noto Sans Bengali", sans-serif' }}>
          {label}
        </p>
      )}
    </div>
  );
}
