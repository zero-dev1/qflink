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
          'px-4 py-1.5 text-sm font-medium transition-colors border',
          selected === null
            ? 'bg-cyan-600 text-white border-cyan-600'
            : 'bg-transparent text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={cn(
            'px-4 py-1.5 text-sm font-medium transition-colors border capitalize',
            selected === cat
              ? 'bg-cyan-600 text-white border-cyan-600'
              : 'bg-transparent text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
