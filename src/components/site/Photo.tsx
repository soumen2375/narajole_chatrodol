import { useState } from 'react';
import Placeholder from './Placeholder';

/**
 * A photo inside a rounded frame. Falls back to the striped placeholder when
 * the source is missing or fails to load.
 */
export default function Photo({
  src,
  alt,
  placeholder,
  className = '',
  imgClassName = '',
  loading = 'lazy',
}: {
  src?: string | null;
  alt: string;
  placeholder: string;
  className?: string;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <Placeholder label={placeholder} className={className} />;
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    </div>
  );
}
