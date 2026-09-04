import React, { useState } from 'react';

// Every image in the app goes through this component.
//
// `alt` is required by the type, so an image cannot ship without one. If the
// file fails to load - offline, blocked, dead remote host - the <img> is
// swapped for a brutalist placeholder that shows the alt text instead of the
// browser's broken-image glyph, so the meaning survives the failure.

export interface ImgProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  /** Required. Empty string is allowed for purely decorative images. */
  alt: string;
  /** Extra classes for the fallback box (defaults to the image classes). */
  fallbackClassName?: string;
}

const Img: React.FC<ImgProps> = ({ alt, className = '', fallbackClassName, loading = 'lazy', ...props }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Decorative images (alt="") leave no trace when they fail.
    if (!alt) return null;
    return (
      <span
        role="img"
        aria-label={alt}
        className={`inline-flex items-center justify-center gap-2 p-3 text-center bg-white dark:bg-black text-black dark:text-yellow-400 border-4 border-dashed border-black dark:border-yellow-400 font-mono text-xs font-bold ${fallbackClassName ?? className}`}
      >
        <span aria-hidden="true">🖼</span>
        <span>{alt}</span>
      </span>
    );
  }

  return (
    <img
      {...props}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      onError={e => {
        setFailed(true);
        props.onError?.(e);
      }}
    />
  );
};

export default Img;
