const { GAME_STATES, DEFAULT_CONFIG } = require('./constants');
const { createDeck, shuffleDeck, dealCards, handScore } = require('./deck');
const { createBoard, getValidMoves, applyMove, getAutoPlayCard, isRoundOver, removeCard } = require('./logic');

class GameRoom {
  constructor(hostId, hostName, config = {}) {
    this.id = this._generateRoomCode();
    this.hostId = hostId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = GAME_STATES.WAITING;
    this.players = []; // { id, name, socketId, seatIndex }
    this.spectators = [];

    // Game state
    this.currentRound = 0;
    this.totalRounds = 0;
    this.hands = {}; // playerId -> card[]
    this.board = createBoard();
    this.currentPlayerIndex = 0; // index into this.players (seat order)
    this.turnOrder = []; // playerIds in clockwise seat order
    this.scores = {}; // playerId -> total score across rounds
    this.roundScores = []; // [{ playerId: score }] per round
    this.turnTimer = null;
    this.matchEconomy = null;

    this.addPlayer(hostId, hostName);
  }

  _generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  findDisconnectedByName(playerName) {
    const normalized = playerName.trim().toLowerCase();
    return this.players.find(
      p => !p.connected && p.name.trim().toLowerCase() === normalized
    );
  }

  migratePlayerId(oldId, newId) {
    const player = this.players.find(p => p.id === oldId);
    if (!player) return { error: 'Player not found' };

    player.id = newId;

    if (this.hands[oldId]) {
      this.hands[newId] = this.hands[oldId];
      delete this.hands[oldId];
    }
    if (this.scores[oldId] !== undefined) {
      this.scores[newId] = this.scores[oldId];
      delete this.scores[oldId];
    }

    this.turnOrder = this.turnOrder.map(id => (id === oldId ? newId : id));
    if (this.hostId === oldId) this.hostId = newId;

    if (this.matchEconomy) {
      if (this.matchEconomy.sessionBankroll[oldId] !== undefined) {
        this.matchEconomy.sessionBankroll[newId] = this.matchEconomy.sessionBankroll[oldId];
        delete this.matchEconomy.sessionBankroll[oldId];
      }
      if (this.matchEconomy.roundWinnings[oldId] !== undefined) {
        this.matchEconomy.roundWinnings[newId] = this.matchEconomy.roundWinnings[oldId];
        delete this.matchEconomy.roundWinnings[oldId];
      }
    }

    return { ok: true };
  }

  reconnectPlayer(playerId, playerName) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not in room' };
    player.connected = true;
    if (playerName) player.name = playerName;
    return { ok: true, player };
  }

  addPlayer(playerId, playerName) {
    if (this.players.length >= this.config.maxPlayers) return { error: 'Room is full' };
    if (this.state !== GAME_STATES.WAITING) return { error: 'Game already started' };
    if (this.players.find(p => p.id === playerId)) return { error: 'Already in room' };

    this.players.push({ id: playerId, name: playerName, connected: true });
    this.scores[playerId] = 0;
    return { ok: true };
  }

  removePlayer(playerId) {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx === -1) return;

    this.players.splice(idx, 1);

    // Promote next player to host if host left
    if (playerId === this.hostId && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }

    // Clean up score entry if waiting
    if (this.state === GAME_STATES.WAITING) {
      delete this.scores[playerId];
    }
  }

  updateSocketId(playerId, socketId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) { player.socketId = socketId; player.connected = true; }
  }

  setPlayerDisconnected(socketId) {
    const player = this.players.find(p => p.socketId === socketId);
    if (player) player.connected = false;
    return player;
  }

  canStart() {
    const connectedCount = this.players.filter(p => p.connected).length;
    return (
      connectedCount >= this.config.minPlayers &&
      this.state === GAME_STATES.WAITING
    );
  }

  returnToLobby() {
    if (this.state !== GAME_STATES.GAME_END && this.state !== GAME_STATES.WAITING) {
      return { error: 'Can only start a new game after the current game ends' };
    }

    this.players = this.players.filter(p => p.connected);
    if (this.players.length === 0) return { error: 'No players in room' };

    if (!this.players.some(p => p.id === this.hostId)) {
      this.hostId = this.players[0].id;
    }

    this.state = GAME_STATES.WAITING;
    this.currentRound = 0;
    this.totalRounds = 0;
    this.hands = {};
    this.board = createBoard();
    this.turnOrder = [];
    this.currentPlayerIndex = 0;
    this.roundScores = [];
    this.scores = {};
    this.matchEconomy = null;
    this.players.forEach(p => {
      this.scores[p.id] = 0;
      delete p.seatIndex;
    });

    return { ok: true };
  }

  startGame(totalRounds) {
    if (!this.canStart()) return { error: 'Cannot start game' };
    if (totalRounds % this.players.length !== 0) return { error: 'Rounds must be a multiple of player count' };

    this.totalRounds = totalRounds;
    this.currentRound = 0;
    this.state = GAME_STATES.PLAYING;

    // Random seat assignment
    this.turnOrder = this._shuffle([...this.players.map(p => p.id)]);
    this.players.forEach((p, i) => { p.seatIndex = this.turnOrder.indexOf(p.id); });

    this._initMatchEconomy(totalRounds);
    const anteResult = this._collectAntes();
    if (anteResult.error) return anteResult;

    this._startRound(false);
    return { ok: true };
  }

  _initMatchEconomy(totalRounds) {
    const ante = this.config.anteAmount;
    this.matchEconomy = {
      ante,
      sessionBankroll: {},
      roundWinnings: {},
      currentPot: 0,
      lastRoundWinner: null,
      lastRoundPot: 0,
    };
    this.turnOrder.forEach(pid => {
      this.matchEconomy.sessionBankroll[pid] = totalRounds * ante;
      this.matchEconomy.roundWinnings[pid] = 0;
    });
  }

  _collectAntes() {
    const ante = this.config.anteAmount;
    let pot = 0;
    for (const pid of this.turnOrder) {
      const bank = this.matchEconomy.sessionBankroll[pid] ?? 0;
      if (bank < ante) return { error: 'A player cannot afford the round entry fee' };
      this.matchEconomy.sessionBankroll[pid] = bank - ante;
      pot += ante;
    }
    this.matchEconomy.currentPot = pot;
    return { ok: true, pot };
  }

  _startRound(collectAnte = true) {
    if (collectAnte) {
      const anteResult = this._collectAntes();
      if (anteResult.error) return anteResult;
    }

    this.currentRound++;
    this.board = createBoard();
    this._lastRoundWinner = null;

    const deck = shuffleDeck(createDeck());
    const dealtHands = dealCards(deck, this.players.length);

    this.hands = {};
    this.turnOrder.forEach((playerId, i) => {
      this.hands[playerId] = dealtHands[i];
    });

    // Find who has 7 of spades
    const starterIndex = this.turnOrder.findIndex(pid =>
      this.hands[pid].some(c => c.suit === 'spades' && c.value === 7)
    );
    this.currentPlayerIndex = starterIndex;
  }

  getCurrentPlayer() {
    return this.turnOrder[this.currentPlayerIndex];
  }

  playCard(playerId, card) {
    if (this.getCurrentPlayer() !== playerId) return { error: 'Not your turn' };
    if (this.state !== GAME_STATES.PLAYING) return { error: 'Game not in play' };

    const hand = this.hands[playerId];
    const cardInHand = hand.find(c => c.suit === card.suit && c.value === card.value);
    if (!cardInHand) return { error: 'Card not in hand' };

    const validMoves = getValidMoves(hand, this.board);
    const isValid = validMoves.some(c => c.suit === card.suit && c.value === card.value);
    if (!isValid) return { error: 'Invalid move' };

    applyMove(card, this.board);
    this.hands[playerId] = removeCard(hand, card);

    if (isRoundOver(Object.values(this.hands))) {
      this._lastRoundWinner = playerId;
      return { ok: true, roundOver: true, ...this._endRound() };
    }

    this._advanceTurn();
    return { ok: true, nextPlayer: this.getCurrentPlayer() };
  }

  skipTurn(playerId) {
    // Called when player has no valid moves
    if (this.getCurrentPlayer() !== playerId) return { error: 'Not your turn' };
    const validMoves = getValidMoves(this.hands[playerId], this.board);
    if (validMoves.length > 0) return { error: 'Player has valid moves, cannot skip' };
    this._advanceTurn();
    return { ok: true, nextPlayer: this.getCurrentPlayer() };
  }

  autoPlay(playerId) {
    if (this.getCurrentPlayer() !== playerId) return { error: 'Not your turn' };
    const hand = this.hands[playerId];
    const card = getAutoPlayCard(hand, this.board);
    if (!card) {
      return this.skipTurn(playerId);
    }
    const result = this.playCard(playerId, card);
    if (result.error) return result;
    return { ...result, autoCard: card };
  }

  _advanceTurn() {
    const n = this.turnOrder.length;
    let next = (this.currentPlayerIndex + 1) % n;
    // Skip players with no cards (already finished — not possible mid-round, but safe)
    let attempts = 0;
    while (this.hands[this.turnOrder[next]]?.length === 0 && attempts < n) {
      next = (next + 1) % n;
      attempts++;
    }
    this.currentPlayerIndex = next;
  }

  _endRound() {
    const roundScore = {};

    this.turnOrder.forEach(pid => {
      roundScore[pid] = handScore(this.hands[pid]);
    });
    this.turnOrder.forEach(pid => {
      this.scores[pid] = (this.scores[pid] || 0) + roundScore[pid];
    });

    this.roundScores.push({ ...roundScore });

    let roundWinnerId = this._lastRoundWinner ?? null;
    let roundPot = 0;
    if (this.matchEconomy && roundWinnerId) {
      roundPot = this.matchEconomy.currentPot;
      this.matchEconomy.roundWinnings[roundWinnerId] =
        (this.matchEconomy.roundWinnings[roundWinnerId] || 0) + roundPot;
      this.matchEconomy.lastRoundWinner = roundWinnerId;
      this.matchEconomy.lastRoundPot = roundPot;
      this.matchEconomy.currentPot = 0;
    }

    const isGameOver = this.currentRound >= this.totalRounds;
    if (isGameOver) {
      this.state = GAME_STATES.GAME_END;
      return {
        roundScore,
        gameOver: true,
        finalScores: this._getFinalRanking(),
        roundWinnerId,
        roundPot,
        matchWinnings: { ...(this.matchEconomy?.roundWinnings ?? {}) },
      };
    }

    this.state = GAME_STATES.ROUND_END;
    return { roundScore, gameOver: false, roundWinnerId, roundPot };
  }

  startNextRound() {
    if (this.state !== GAME_STATES.ROUND_END) return { error: 'Not in round end state' };
    this.state = GAME_STATES.PLAYING;
    const anteResult = this._collectAntes();
    if (anteResult.error) return anteResult;
    this._startRound(false);
    return { ok: true };
  }

  _getFinalRanking() {
    return this.turnOrder
      .map(pid => ({ id: pid, name: this.players.find(p => p.id === pid)?.name, score: this.scores[pid] }))
      .sort((a, b) => a.score - b.score);
  }

  getValidMovesForPlayer(playerId) {
    return getValidMoves(this.hands[playerId] || [], this.board);
  }

  getPublicState(forPlayerId = null) {
    return {
      roomId: this.id,
      state: this.state,
      config: this.config,
      hostId: this.hostId,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        seatIndex: p.seatIndex,
        cardCount: this.hands[p.id]?.length ?? null,
        score: this.scores[p.id] ?? 0,
        sessionBankroll: this.matchEconomy?.sessionBankroll[p.id] ?? null,
        roundWinnings: this.matchEconomy?.roundWinnings[p.id] ?? null,
      })),
      economy: this.matchEconomy ? {
        ante: this.matchEconomy.ante,
        currentPot: this.matchEconomy.currentPot,
        lastRoundWinner: this.matchEconomy.lastRoundWinner,
        lastRoundPot: this.matchEconomy.lastRoundPot,
      } : null,
      board: this.board,
      currentPlayer: this.getCurrentPlayer?.() ?? null,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      turnOrder: this.turnOrder,
      hand: forPlayerId ? this.hands[forPlayerId] : undefined,
      validMoves: forPlayerId ? this.getValidMovesForPlayer(forPlayerId) : undefined,
      roundScores: this.roundScores,
    };
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

module.exports = { GameRoom };
