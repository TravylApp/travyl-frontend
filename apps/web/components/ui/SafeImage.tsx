"use client";

import { useState } from "react";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
}

export function SafeImage({ src, alt, fallbackSrc, onError, ...rest }: SafeImageProps) {
  const [errored, setErrored] = useState(false);
  const finalSrc = errored && fallbackSrc ? fallbackSrc : src;
  return (
    <img
      src={finalSrc}
      alt={alt}
      onError={(e) => {
        if (!errored) setErrored(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}

export default SafeImage;
