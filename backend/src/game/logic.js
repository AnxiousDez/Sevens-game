const { SUITS, SUIT_PRIORITY } = require('./constants');

/**
 * board: { spades: [min, max], hearts: [min, max], ... }
 * null means suit not opened yet
 * Initialized as null for each suit, set to [7,7] when 7 is played
 */
function createBoard() {
  return { spades: null, hearts: null, diamonds: null, clubs: null };
}

function isBoardEmpty(board) {
  return Object.values(board).every((range) => range === null);
}

/**
 * Returns all valid moves for a hand given the current board.
 * On the first play of a round (empty board), only 7♠ is legal.
 */
function getValidMoves(hand, board) {
  if (isBoardEmpty(board)) {
    const sevenSpades = hand.find(c => c.suit === 'spades' && c.value === 7);
    return sevenSpades ? [sevenSpades] : [];
  }

  const moves = [];
  for (const card of hand) {
    if (isValidMove(card, board)) {
      moves.push(card);
    }
  }
  return moves;
}

function isValidMove(card, board) {
  const { suit, value } = card;
  if (value === 7) {
    // Can always play a 7 (opens new suit or extends — but 7 is the anchor so it's always valid as opener)
    // If suit already open, 7 is already on board so playing another 7 of same suit is impossible (only one 7 per suit)
    return board[suit] === null; // Opens a new suit
  }
  const range = board[suit];
  if (!range) return false; // Suit not opened, non-7 can't be played
  return value === range[0] - 1 || value === range[1] + 1;
}

/**
 * Apply a card to the board. Mutates board.
 */
function applyMove(card, board) {
  const { suit, value } = card;
  if (value === 7) {
    board[suit] = [7, 7];
  } else {
    const range = board[suit];
    if (value === range[0] - 1) board[suit][0] = value;
    else if (value === range[1] + 1) board[suit][1] = value;
  }
  return board;
}

/**
 * Auto-play logic on timeout:
 * Priority 1: Lowest value card among valid moves on already-opened suits (non-7 moves)
 * Priority 2: Play a 7 to open a new suit (lowest priority suit: spades > hearts > diamonds > clubs)
 * Priority 3: null (skip turn)
 */
function getAutoPlayCard(hand, board) {
  if (isBoardEmpty(board)) {
    return hand.find(c => c.suit === 'spades' && c.value === 7) ?? null;
  }

  const validMoves = getValidMoves(hand, board);
  if (validMoves.length === 0) return null;

  // Priority 1: non-7 valid moves on open suits
  const openSuitMoves = validMoves.filter(c => c.value !== 7);
  if (openSuitMoves.length > 0) {
    // Lowest value wins
    return openSuitMoves.reduce((min, c) => c.value < min.value ? c : min);
  }

  // Priority 2: 7s — pick by suit priority
  const sevenMoves = validMoves.filter(c => c.value === 7);
  if (sevenMoves.length > 0) {
    return sevenMoves.sort((a, b) =>
      SUIT_PRIORITY.indexOf(a.suit) - SUIT_PRIORITY.indexOf(b.suit)
    )[0];
  }

  return null;
}

/**
 * Check if the round is over (any player has empty hand)
 */
function isRoundOver(hands) {
  return hands.some(h => h.length === 0);
}

/**
 * Remove a card from a hand array. Returns new hand.
 */
function removeCard(hand, card) {
  const idx = hand.findIndex(c => c.suit === card.suit && c.value === card.value);
  if (idx === -1) return hand;
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)];
}

module.exports = {
  createBoard, getValidMoves, isValidMove, isBoardEmpty,
  applyMove, getAutoPlayCard, isRoundOver, removeCard
};
