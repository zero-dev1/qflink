import { motion } from 'framer-motion';
import { PodData } from '@/stores/pods';
import { formatCompactBalance } from '@/lib/utils';

interface PodCardProps {
  pod: PodData;
  isOfficial?: boolean;
  onClick: () => void;
}

export function PodCard({ pod, isOfficial = false, onClick }: PodCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ backgroundColor: '#1A1A1A' }}
      className={`bg-surface-2 border border-border-subtle rounded-lg cursor-pointer transition-colors duration-150 ${
        isOfficial ? 'border-t-2 border-t-cyan-primary p-6' : 'p-4'
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        {/* Category tag */}
        <div className="text-caption text-text-tertiary mb-2">
          {pod.category.charAt(0).toUpperCase() + pod.category.slice(1)}
        </div>
        
        {/* Pod name */}
        <h3 className="text-h3 font-sans font-semibold text-text-primary mb-2">
          {pod.name}
        </h3>
        
        {/* Description */}
        <p className="text-body-sm text-text-secondary line-clamp-2 flex-grow mb-4">
          {pod.description}
        </p>
        
        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="text-caption text-text-tertiary">
            {pod.memberCount} members
          </div>
          
          {/* Threshold badge if > 0 */}
          {pod.threshold > 0n && (
            <div className="bg-cyan-muted text-cyan-primary text-caption px-2 py-0.5 rounded-pill">
              {formatCompactBalance(pod.threshold)} entry
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
