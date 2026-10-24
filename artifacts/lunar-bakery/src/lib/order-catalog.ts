export type MenuSeason = 'spring' | 'summer' | 'fall' | 'winter';

export const SEASONS: { key: MenuSeason; label: string }[] = [
  { key: 'spring', label: 'Spring' },
  { key: 'summer', label: 'Summer' },
  { key: 'fall', label: 'Fall' },
  { key: 'winter', label: 'Winter' },
];

export const SEASONAL_MENU: Record<
  MenuSeason,
  { id: string; name: string; priceCents: number }[]
> = {
  spring: [
    { id: 'strawberry-mochi-tart', name: 'Strawberry Mochi Tart', priceCents: 700 },
    { id: 'matcha-croissant', name: 'Matcha Croissant', priceCents: 600 },
    { id: 'cherry-blossom-financier', name: 'Cherry Blossom Financier', priceCents: 500 },
    { id: 'earl-grey-kouign-amann', name: 'Earl Grey Kouign-Amann', priceCents: 800 },
  ],
  summer: [
    { id: 'pastel-de-nata', name: 'Pastel de Nata', priceCents: 600 },
    { id: 'kouign-amann', name: 'Kouign-Amann', priceCents: 700 },
    { id: 'natas-and-kouigns', name: 'Natas & Kouigns', priceCents: 600 },
    { id: 'kouign-with-gold', name: 'Kouign with Gold', priceCents: 800 },
  ],
  fall: [
    { id: 'taro-puff', name: 'Taro Puff', priceCents: 600 },
    { id: 'osmanthus-madeleine', name: 'Osmanthus Madeleine', priceCents: 500 },
    { id: 'chestnut-mont-blanc', name: 'Chestnut Mont Blanc', priceCents: 900 },
    { id: 'black-sesame-kouign-amann', name: 'Black Sesame Kouign-Amann', priceCents: 800 },
  ],
  winter: [
    { id: 'tangerine-cake', name: 'Tangerine Cake', priceCents: 700 },
    { id: 'red-bean-danish', name: 'Red Bean Danish', priceCents: 600 },
    { id: 'longan-bun', name: 'Longan Bun', priceCents: 500 },
    { id: 'yuja-eclair', name: 'Yuja Éclair', priceCents: 700 },
  ],
};

export function getCurrentSeason(date = new Date()): MenuSeason {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}
