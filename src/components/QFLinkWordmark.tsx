import React from 'react'

export interface QFLinkWordmarkProps {
  size?: number       // height in px, default 32
  className?: string
  variant?: 'dark' | 'light' | 'auto'  // dark = for dark backgrounds, light = for light backgrounds, auto = CSS-based switching
}

export const QFLinkWordmark: React.FC<QFLinkWordmarkProps> = ({
  size = 32,
  className = '',
  variant = 'dark',
}) => {
  // For auto variant, render both images and use CSS to toggle visibility based on dark mode
  if (variant === 'auto') {
    return (
      <>
        <img
          src="/logo-full-light.svg"
          alt="QFLink"
          style={{ height: size }}
          className={`dark:hidden ${className}`}
        />
        <img
          src="/logo-full-dark.svg"
          alt="QFLink"
          style={{ height: size }}
          className={`hidden dark:block ${className}`}
        />
      </>
    )
  }

  // For explicit dark/light variants, render single image
  const src = variant === 'dark' ? '/logo-full-dark.svg' : '/logo-full-light.svg'
  return (
    <img
      src={src}
      alt="QFLink"
      style={{ height: size }}
      className={className}
    />
  )
}

export default QFLinkWordmark
