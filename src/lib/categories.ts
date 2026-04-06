// src/lib/categories.ts

export const CATEGORY_COLORS: Record<string, string> = {
  Trading: '#10B981',
  Alpha: '#F59E0B',
  DeFi: '#8B5CF6',
  Gaming: '#F97316',
  Builders: '#3B82F6',
  Social: '#00EFE7',
  NFTs: '#EC4899',
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Social;
}

export function getCategoryBg(category: string): string {
  const map: Record<string, string> = {
    Trading: 'bg-cat-trading',
    Alpha: 'bg-cat-alpha',
    DeFi: 'bg-cat-defi',
    Gaming: 'bg-cat-gaming',
    Builders: 'bg-cat-builders',
    Social: 'bg-cat-social',
    NFTs: 'bg-cat-nfts',
  };
  return map[category] || 'bg-cat-social';
}
