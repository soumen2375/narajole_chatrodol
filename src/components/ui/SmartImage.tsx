import { useState } from 'react';
import { FALLBACK_IMAGE } from '@/data/content';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
}

export default function SmartImage({ src, alt, fallback = FALLBACK_IMAGE, ...rest }: SmartImageProps) {
  const [current, setCurrent] = useState(src);
  return (
    <img
      {...rest}
      src={current}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
