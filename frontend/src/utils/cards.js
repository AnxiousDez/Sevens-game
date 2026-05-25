export const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
export const SUIT_COLORS = { spades: '#e2e8f0', hearts: '#f87171', diamonds: '#f87171', clubs: '#e2e8f0' };
export const SUIT_COLORS_DARK = { spades: '#94a3b8', hearts: '#ef4444', diamonds: '#ef4444', clubs: '#94a3b8' };

export function cardLabel(value) {
  if (value === 1) return 'A';
  if (value === 11) return 'J';
  if (value === 12) return 'Q';
  if (value === 13) return 'K';
  return String(value);
}

export function cardId(card) {
  return `${card.suit}-${card.value}`;
}

export function isValidMove(card, validMoves) {
  return validMoves.some(m => m.suit === card.suit && m.value === card.value);
}

export function suitOrder(suit) {
  return ['spades', 'hearts', 'diamonds', 'clubs'].indexOf(suit);
}
