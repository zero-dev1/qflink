import React from 'react'

export interface QFLinkLogoProps {
  size?: number        // width & height in px, default 32
  className?: string   // additional CSS classes
}

export const QFLinkLogo: React.FC<QFLinkLogoProps> = ({
  size = 32,
  className = '',
}) => {
  return (
    <img
      src="/logo.svg"
      alt="QFLink"
      width={size}
      height={size}
      className={className}
    />
  )
}

export default QFLinkLogo
