const SHOP_CATALOG = {
  boards: [
    { id: 'board-default', name: 'Classic Felt', price: 0, tier: 'free', kind: 'css' },
    { id: 'board-midnight', name: 'Midnight Blue', price: 50, tier: 'common', kind: 'css' },
    { id: 'board-emerald', name: 'Emerald Table', price: 75, tier: 'common', kind: 'css' },
    { id: 'board-royal', name: 'Royal Gold', price: 100, tier: 'rare', kind: 'css' },
    { id: 'board-slate', name: 'Slate Stone', price: 100, tier: 'rare', kind: 'css' },
    { id: 'board-amber', name: 'Amber Lounge', price: 125, tier: 'rare', kind: 'css' },
    { id: 'board-crimson', name: 'Crimson Lounge', price: 150, tier: 'epic', kind: 'css' },
    { id: 'board-velvet', name: 'Velvet Purple', price: 175, tier: 'epic', kind: 'css' },
  ],
  cards: [
    { id: 'cards-default', name: 'Classic Ivory', price: 0, tier: 'free', kind: 'css' },
    { id: 'cards-ocean', name: 'Ocean Breeze', price: 100, tier: 'common', kind: 'css' },
    { id: 'cards-neon', name: 'Neon Nights', price: 150, tier: 'rare', kind: 'css' },
    { id: 'cards-royal', name: 'Royal Purple', price: 200, tier: 'epic', kind: 'css' },
    { id: 'cards-retro', name: 'Retro Pixel', price: 250, tier: 'premium', kind: 'css' },
    { id: 'cards-scroll', name: 'Fantasy Scroll', price: 275, tier: 'premium', kind: 'css' },
    { id: 'cards-ember', name: 'Ember Flame', price: 300, tier: 'premium', kind: 'css' },
    { id: 'cards-sketch', name: 'Hand Sketch', price: 325, tier: 'premium', kind: 'css' },
    { id: 'cards-pixel', name: 'Spicy Pixel Deck', price: 350, tier: 'artwork', kind: 'image' },
    { id: 'cards-handdrawn', name: 'Hand Drawn Deck', price: 400, tier: 'artwork', kind: 'image' },
    { id: 'cards-pixel-fantasy', name: 'Pixel Fantasy Deck', price: 450, tier: 'artwork', kind: 'image' },
    { id: 'cards-kernel', name: 'Kernel Pixel Deck', price: 500, tier: 'artwork', kind: 'image' },
    { id: 'cards-classic', name: 'Classic Modular', price: 550, tier: 'artwork', kind: 'image' },
    { id: 'cards-fantasy-icons', name: 'Fantasy Icons', price: 600, tier: 'artwork', kind: 'image' },
    { id: 'cards-fire-icons', name: 'Fire Icons', price: 650, tier: 'artwork', kind: 'image' },
  ],
};

const DEFAULT_BOARD = 'board-default';
const DEFAULT_CARDS = 'cards-default';

function getCatalogItem(type, itemId) {
  const list = SHOP_CATALOG[type];
  if (!list) return null;
  return list.find(item => item.id === itemId) ?? null;
}

module.exports = { SHOP_CATALOG, DEFAULT_BOARD, DEFAULT_CARDS, getCatalogItem };
