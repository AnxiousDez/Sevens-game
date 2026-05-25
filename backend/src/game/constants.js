const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // 1=Ace, 11=J, 12=Q, 13=K

const CARD_DISPLAY = {
  1: 'A', 11: 'J', 12: 'Q', 13: 'K'
};

const DEFAULT_CONFIG = {
  maxPlayers: 7,
  minPlayers: 3,
  turnTimerSeconds: 30,
  anteAmount: 25,
};

const GAME_STATES = {
  WAITING: 'waiting',
  STARTING: 'starting',
  PLAYING: 'playing',
  ROUND_END: 'round_end',
  GAME_END: 'game_end',
};

const SUIT_PRIORITY = ['spades', 'hearts', 'diamonds', 'clubs']; // for auto-play tiebreak

module.exports = { SUITS, SUIT_SYMBOLS, VALUES, CARD_DISPLAY, DEFAULT_CONFIG, GAME_STATES, SUIT_PRIORITY };
