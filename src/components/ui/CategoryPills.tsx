import React from 'react'
import { cn } from '@/lib/utils'
import type { PodCategory } from '@/types'

interface CategoryPillsProps {
  categories: readonly string[]
  selected: string | null
  onSelect: (category: string | null) => void
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({ categories, selected, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors border',
          selected === null
            ? 'bg-qf-accent text-qf-accent-text border-qf-accent'
            : 'bg-transparent text-qf-text-secondary border-qf-border-prominent hover:border-qf-text-secondary'
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors border capitalize',
            selected === cat
              ? 'bg-qf-accent text-qf-accent-text border-qf-accent'
              : 'bg-transparent text-qf-text-secondary border-qf-border-prominent hover:border-qf-text-secondary'
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
