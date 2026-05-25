const { SUITS, VALUES } = require('./constants');

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function dealCards(deck, numPlayers) {
  const hands = Array.from({ length: numPlayers }, () => []);
  deck.forEach((card, i) => {
    hands[i % numPlayers].push(card);
  });
  // Sort each hand: by suit then value
  hands.forEach(hand => hand.sort((a, b) =>
    ['spades','hearts','diamonds','clubs'].indexOf(a.suit) - ['spades','hearts','diamonds','clubs'].indexOf(b.suit)
    || a.value - b.value
  ));
  return hands;
}

function handScore(hand) {
  return hand.reduce((sum, card) => sum + card.value, 0);
}

module.exports = { createDeck, shuffleDeck, dealCards, handScore };
