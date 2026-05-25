const { SHOP_CATALOG, DEFAULT_BOARD, DEFAULT_CARDS, getCatalogItem } = require('../shop/catalog');
const { kv } = require('../store/kv');
const { WALLET_TTL_SECONDS } = require('../config');

const WALLET_SCHEMA_VERSION = 2;

function walletKey(playerId) {
  return `wallet:${playerId}`;
}

class WalletManager {
  _createWallet() {
    return {
      schemaVersion: WALLET_SCHEMA_VERSION,
      coins: 0,
      ownedBoards: [DEFAULT_BOARD],
      ownedCards: [DEFAULT_CARDS],
      equippedBoard: DEFAULT_BOARD,
      equippedCards: DEFAULT_CARDS,
      lastSeen: Date.now(),
    };
  }

  _sanitizeWallet(wallet) {
    if (wallet.schemaVersion !== WALLET_SCHEMA_VERSION) {
      wallet.schemaVersion = WALLET_SCHEMA_VERSION;
      wallet.coins = 0;
      wallet.ownedBoards = [DEFAULT_BOARD];
      wallet.ownedCards = [DEFAULT_CARDS];
      wallet.equippedBoard = DEFAULT_BOARD;
      wallet.equippedCards = DEFAULT_CARDS;
      return wallet;
    }

    const boardIds = new Set(SHOP_CATALOG.boards.map(b => b.id));
    const cardIds = new Set(SHOP_CATALOG.cards.map(c => c.id));

    wallet.ownedBoards = wallet.ownedBoards.filter(id => boardIds.has(id));
    wallet.ownedCards = wallet.ownedCards.filter(id => cardIds.has(id));

    if (!wallet.ownedBoards.includes(DEFAULT_BOARD)) wallet.ownedBoards.unshift(DEFAULT_BOARD);
    if (!wallet.ownedCards.includes(DEFAULT_CARDS)) wallet.ownedCards.unshift(DEFAULT_CARDS);
    if (!boardIds.has(wallet.equippedBoard)) wallet.equippedBoard = DEFAULT_BOARD;
    if (!cardIds.has(wallet.equippedCards)) wallet.equippedCards = DEFAULT_CARDS;

    return wallet;
  }

  async touch(playerId) {
    const wallet = await this.getOrCreate(playerId);
    wallet.lastSeen = Date.now();
    await this._save(playerId, wallet);
    return wallet;
  }

  async getOrCreate(playerId) {
    let wallet = await kv.getJson(walletKey(playerId));
    if (!wallet) {
      wallet = this._createWallet();
      await this._save(playerId, wallet);
      return wallet;
    }
    wallet = this._sanitizeWallet(wallet);
    wallet.lastSeen = Date.now();
    await this._save(playerId, wallet);
    return wallet;
  }

  async _save(playerId, wallet) {
    await kv.setJson(walletKey(playerId), wallet, WALLET_TTL_SECONDS);
  }

  async getPublicWallet(playerId) {
    const w = await this.getOrCreate(playerId);
    return {
      coins: w.coins,
      ownedBoards: [...w.ownedBoards],
      ownedCards: [...w.ownedCards],
      equippedBoard: w.equippedBoard,
      equippedCards: w.equippedCards,
      catalog: SHOP_CATALOG,
    };
  }

  async addCoins(playerId, amount) {
    if (amount <= 0) return;
    const w = await this.getOrCreate(playerId);
    w.coins += amount;
    w.lastSeen = Date.now();
    await this._save(playerId, w);
  }

  async buy(playerId, type, itemId) {
    if (type !== 'boards' && type !== 'cards') return { error: 'Invalid item type' };
    const item = getCatalogItem(type, itemId);
    if (!item) return { error: 'Item not found' };

    const w = await this.getOrCreate(playerId);
    const owned = type === 'boards' ? w.ownedBoards : w.ownedCards;
    if (owned.includes(itemId)) return { error: 'Already owned' };
    if (w.coins < item.price) return { error: 'Not enough coins' };

    w.coins -= item.price;
    owned.push(itemId);
    w.lastSeen = Date.now();
    await this._save(playerId, w);
    return { ok: true, wallet: await this.getPublicWallet(playerId) };
  }

  async equip(playerId, type, itemId) {
    if (type !== 'boards' && type !== 'cards') return { error: 'Invalid item type' };
    const w = await this.getOrCreate(playerId);
    if (type === 'boards') {
      if (!w.ownedBoards.includes(itemId)) return { error: 'Board not owned' };
      w.equippedBoard = itemId;
    } else {
      if (!w.ownedCards.includes(itemId)) return { error: 'Card design not owned' };
      w.equippedCards = itemId;
    }
    w.lastSeen = Date.now();
    await this._save(playerId, w);
    return { ok: true, wallet: await this.getPublicWallet(playerId) };
  }

  async migrateWallet(oldId, newId) {
    if (oldId === newId) return;
    const oldWallet = await kv.getJson(walletKey(oldId));
    if (!oldWallet) return;
    const newWallet = await this.getOrCreate(newId);
    newWallet.coins += oldWallet.coins;
    oldWallet.ownedBoards.forEach(id => {
      if (!newWallet.ownedBoards.includes(id)) newWallet.ownedBoards.push(id);
    });
    oldWallet.ownedCards.forEach(id => {
      if (!newWallet.ownedCards.includes(id)) newWallet.ownedCards.push(id);
    });
    this._sanitizeWallet(newWallet);
    await this._save(newId, newWallet);
    await kv.del(walletKey(oldId));
  }
}

module.exports = { WalletManager };
