import React from 'react'

export const SectionNum: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-xs font-bold tracking-widest uppercase text-cyan-600 block mb-2">{children}</span>
)

export const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-5">{children}</h2>
)

export const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3">{children}</h3>
)

export const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-5">{children}</p>
)

export const Em: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <em className="text-cyan-400 italic not-italic">{children}</em>
)

export const Strong: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="text-gray-900 dark:text-white font-semibold">{children}</strong>
)

export const Blockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <blockquote className="border-l-[3px] border-cyan-600 bg-gray-50 dark:bg-[#111118] pl-6 py-4 my-6 text-gray-500 dark:text-gray-400 italic">
    {children}
  </blockquote>
)

export const HighlightBox: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border border-cyan-600 bg-cyan-600/5 dark:bg-cyan-600/5 p-6 my-6">
    <span className="text-xs font-bold tracking-widest uppercase text-cyan-600 block mb-3">{title}</span>
    {children}
  </div>
)

export const Divider: React.FC = () => (
  <div className="border-t border-gray-200 dark:border-[#1e293b] my-12" />
)

export const Check: React.FC = () => <span className="text-cyan-400 font-bold">✓</span>
export const Cross: React.FC = () => <span className="text-gray-400 dark:text-gray-600">✗</span>

export const TableWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto my-6">
    <table className="w-full border-collapse text-sm">{children}</table>
  </div>
)

export const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="bg-gray-100 dark:bg-[#1a1a24] text-cyan-600 dark:text-cyan-400 uppercase text-xs font-semibold tracking-wider px-4 py-3 text-left border-b border-gray-200 dark:border-[#1e293b]">
    {children}
  </th>
)

export const Td: React.FC<{ children: React.ReactNode; strong?: boolean }> = ({ children, strong }) => (
  <td className={`px-4 py-3 border-b border-gray-200 dark:border-[#1e293b] ${strong ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
    {children}
  </td>
)

export const StatGrid: React.FC<{ items: { value: string; label: string }[] }> = ({ items }) => (
  <div className="flex flex-wrap my-6">
    {items.map((item, i) => (
      <div
        key={i}
        className={`flex-1 min-w-[120px] px-5 py-4 bg-gray-50 dark:bg-[#111118] border border-gray-200 dark:border-[#1e293b] ${i > 0 ? '-ml-px' : ''}`}
      >
        <span className="block text-2xl font-bold text-cyan-600 dark:text-cyan-400 leading-none mb-1">{item.value}</span>
        <span className="block text-xs text-gray-500">{item.label}</span>
      </div>
    ))}
  </div>
)

export const TwoCol: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">{children}</div>
)

export const TwoColItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border border-gray-200 dark:border-[#1e293b] bg-gray-50 dark:bg-[#111118] p-5">{children}</div>
)

export const UL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 leading-relaxed mb-5 space-y-1.5">{children}</ul>
)

export const OL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ol className="list-decimal pl-5 text-gray-600 dark:text-gray-400 leading-relaxed mb-5 space-y-1.5">{children}</ol>
)

export const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="font-mono text-sm text-cyan-600 dark:text-cyan-400 bg-gray-100 dark:bg-[#1a1a24] px-1.5 py-0.5 border border-gray-200 dark:border-[#1e293b]">{children}</code>
)

export interface TimelineItemProps {
  phase: string
  title: string
  description: React.ReactNode
  completed?: boolean
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ phase, title, description, completed }) => (
  <div className="relative pl-6 mb-8 last:mb-0">
    <div
      className={`absolute left-0 top-1.5 w-2 h-2 -translate-x-[calc(50%-1px)] ${
        completed
          ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
          : 'bg-gray-200 dark:bg-[#1a1a24] border border-gray-300 dark:border-[#1e293b]'
      }`}
    />
    <span className={`text-xs font-bold tracking-widest uppercase block mb-1 ${completed ? 'text-cyan-500 dark:text-cyan-400' : 'text-cyan-600'}`}>
      {phase}
    </span>
    <div className="text-gray-900 dark:text-white font-semibold mb-1">{title}</div>
    <div className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{description}</div>
  </div>
)
