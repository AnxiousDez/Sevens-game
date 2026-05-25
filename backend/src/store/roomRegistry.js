const { randomUUID } = require('crypto');
const { kv } = require('./kv');
const { ROOM_TTL_SECONDS } = require('../config');

function roomKey(roomId) {
  return `room:${roomId}:seats`;
}

function metaKey(roomId) {
  return `room:${roomId}:meta`;
}

class RoomRegistry {
  constructor(ttlSeconds = ROOM_TTL_SECONDS) {
    this.ttl = ttlSeconds;
  }

  async getMeta(roomId) {
    return kv.getJson(metaKey(roomId));
  }

  async setMeta(roomId, meta) {
    await kv.setJson(metaKey(roomId), meta, this.ttl);
  }

  async getSeats(roomId) {
    const data = await kv.getJson(roomKey(roomId));
    return data || {};
  }

  async saveSeats(roomId, seats) {
    await kv.setJson(roomKey(roomId), seats, this.ttl);
  }

  async registerSeat(roomId, playerId, playerName) {
    const seats = await this.getSeats(roomId);
    const existing = seats[playerId];

    if (existing) {
      existing.connected = true;
      if (playerName) existing.name = playerName;
      await this.saveSeats(roomId, seats);
      return { seatToken: existing.seatToken, seat: existing };
    }

    const seatToken = randomUUID();
    seats[playerId] = {
      seatToken,
      name: playerName,
      connected: true,
      joinedAt: Date.now(),
    };
    await this.saveSeats(roomId, seats);

    const meta = (await this.getMeta(roomId)) || { roomId, locked: false };
    meta.roomId = roomId;
    await this.setMeta(roomId, meta);

    return { seatToken, seat: seats[playerId] };
  }

  async verifySeat(roomId, playerId, seatToken) {
    const seats = await this.getSeats(roomId);
    const seat = seats[playerId];
    if (!seat) return false;
    return seat.seatToken === seatToken;
  }

  async hasSeat(roomId, playerId) {
    const seats = await this.getSeats(roomId);
    return !!seats[playerId];
  }

  async setConnected(roomId, playerId, connected) {
    const seats = await this.getSeats(roomId);
    if (!seats[playerId]) return;
    seats[playerId].connected = connected;
    await this.saveSeats(roomId, seats);
  }

  async removeSeat(roomId, playerId) {
    const seats = await this.getSeats(roomId);
    if (!seats[playerId]) return;
    delete seats[playerId];
    if (Object.keys(seats).length === 0) {
      await this.deleteRoom(roomId);
    } else {
      await this.saveSeats(roomId, seats);
    }
  }

  async lockRoom(roomId) {
    const meta = (await this.getMeta(roomId)) || { roomId, locked: false };
    meta.locked = true;
    meta.lockedAt = Date.now();
    await this.setMeta(roomId, meta);
  }

  async unlockRoom(roomId) {
    const meta = (await this.getMeta(roomId)) || { roomId, locked: false };
    meta.locked = false;
    delete meta.lockedAt;
    await this.setMeta(roomId, meta);
  }

  async isLocked(roomId) {
    const meta = await this.getMeta(roomId);
    return meta?.locked === true;
  }

  async deleteRoom(roomId) {
    await kv.del(roomKey(roomId));
    await kv.del(metaKey(roomId));
  }
}

module.exports = { RoomRegistry };
