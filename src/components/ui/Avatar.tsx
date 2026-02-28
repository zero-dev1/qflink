import React, { useEffect, useRef } from 'react'
import * as jdenticon from 'jdenticon'
import { cn } from '@/lib/utils'

interface AvatarProps {
  address: string
  size?: 'sm' | 'md' | 'lg' | number
  className?: string
}

const sizeMap = { sm: 32, md: 40, lg: 48 }

export const Avatar: React.FC<AvatarProps> = ({ address, size = 'md', className }) => {
  const svgRef = useRef<HTMLDivElement>(null)
  const px = typeof size === 'number' ? size : sizeMap[size]

  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.innerHTML = jdenticon.toSvg(address, px)
    }
  }, [address, px])

  return (
    <div
      ref={svgRef}
      className={cn(
        'rounded-full border border-qx-border-prominent overflow-hidden flex-shrink-0',
        className
      )}
      style={{ width: px, height: px }}
    />
  )
}
