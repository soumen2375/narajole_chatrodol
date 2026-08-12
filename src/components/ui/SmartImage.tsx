import { useEffect, useRef, useState } from 'react';
import { FALLBACK_IMAGE } from '@/data/content';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
}

export default function SmartImage({ src, alt, fallback = FALLBACK_IMAGE, ...rest }: SmartImageProps) {
  const effectiveSrc = src?.trim() || fallback;
  const [current, setCurrent] = useState(effectiveSrc);
  // Track broken URLs so we don't reset back to them when the parent re-renders
  const brokenSrcs = useRef<Set<string>>(new Set());

  useEffect(() => {
    const next = src?.trim() || fallback;
    // Only switch to the new src if it hasn't already errored
    if (!brokenSrcs.current.has(next)) {
      setCurrent(next);
    }
  }, [src, fallback]);

  return (
    <img
      {...rest}
      src={current}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (current !== fallback) {
          brokenSrcs.current.add(current);
          setCurrent(fallback);
        }
      }}
    />
  );
}

