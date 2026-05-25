const { GameRoom } = require('../game/room');
const { GAME_STATES } = require('../game/constants');
const { RoomRegistry } = require('../store/roomRegistry');

class RoomManager {
  constructor(registry = new RoomRegistry()) {
    this.rooms = new Map();
    this.socketToPlayer = new Map();
    this.playerToRoom = new Map();
    this.registry = registry;
  }

  async createRoom(socketId, playerId, playerName, config) {
    const room = new GameRoom(playerId, playerName, config);
    this.rooms.set(room.id, room);
    room.updateSocketId(playerId, socketId);
    this.socketToPlayer.set(socketId, { playerId, roomId: room.id });
    this.playerToRoom.set(playerId, room.id);

    const { seatToken } = await this.registry.registerSeat(room.id, playerId, playerName);
    return { room, seatToken };
  }

  async _resolveSeatToken(roomId, playerId, playerName, seatToken) {
    const room = this.rooms.get(roomId);
    const existingPlayer = room?.players.find(p => p.id === playerId);
    if (!existingPlayer) return { error: 'You are not seated in this game' };

    if (seatToken && await this.registry.verifySeat(roomId, playerId, seatToken)) {
      return { ok: true, seatToken };
    }
    const { seatToken: newToken } = await this.registry.registerSeat(roomId, playerId, playerName);
    return { ok: true, seatToken: newToken, recovered: true };
  }

  async joinRoom(roomId, socketId, playerId, playerName, seatToken = null) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    const locked = await this.registry.isLocked(roomId);
    const existingPlayer = room.players.find(p => p.id === playerId);

    if (room.state !== GAME_STATES.WAITING) {
      if (!existingPlayer) {
        return { error: 'Game in progress — only players who were in this game can rejoin' };
      }
      const seatResult = await this._resolveSeatToken(roomId, playerId, playerName, seatToken);
      if (seatResult.error) return seatResult;
      seatToken = seatResult.seatToken;

      room.updateSocketId(playerId, socketId);
      if (playerName) {
        const p = room.players.find(pl => pl.id === playerId);
        if (p) p.name = playerName;
      }
      await this.registry.setConnected(roomId, playerId, true);
      this.socketToPlayer.set(socketId, { playerId, roomId });
      this.playerToRoom.set(playerId, roomId);
      return { ok: true, room, reconnected: true, seatToken };
    }

    if (locked) {
      return { error: 'Game is in progress — use rejoin with your seat token' };
    }

    if (existingPlayer) {
      room.updateSocketId(playerId, socketId);
      this.socketToPlayer.set(socketId, { playerId, roomId });
      this.playerToRoom.set(playerId, roomId);
      const { seatToken: token } = await this.registry.registerSeat(roomId, playerId, playerName);
      return { ok: true, room, reconnected: true, seatToken: token };
    }

    const addResult = room.addPlayer(playerId, playerName);
    if (addResult.error) return addResult;

    const { seatToken: token } = await this.registry.registerSeat(roomId, playerId, playerName);
    room.updateSocketId(playerId, socketId);
    this.socketToPlayer.set(socketId, { playerId, roomId });
    this.playerToRoom.set(playerId, roomId);
    return { ok: true, room, reconnected: false, seatToken: token };
  }

  async rejoinRoom(roomId, socketId, playerId, seatToken, playerName) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: 'Room not found' };

    if (room.state === GAME_STATES.WAITING) {
      return this.joinRoom(roomId, socketId, playerId, playerName, seatToken);
    }

    const seatResult = await this._resolveSeatToken(roomId, playerId, playerName, seatToken);
    if (seatResult.error) return seatResult;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { error: 'You are not seated in this game' };

    room.updateSocketId(playerId, socketId);
    if (playerName) player.name = playerName;
    await this.registry.setConnected(roomId, playerId, true);

    this.socketToPlayer.set(socketId, { playerId, roomId });
    this.playerToRoom.set(playerId, roomId);
    return { ok: true, room, seatToken: seatResult.seatToken };
  }

  async lockRoom(roomId) {
    await this.registry.lockRoom(roomId);
  }

  async unlockRoom(roomId) {
    await this.registry.unlockRoom(roomId);
  }

  getPlayerBySocket(socketId) {
    return this.socketToPlayer.get(socketId) ?? null;
  }

  async leaveRoom(socketId) {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return { error: 'Not in a room' };

    const room = this.rooms.get(info.roomId);
    if (!room) return { error: 'Room not found' };

    const playerId = info.playerId;
    this.socketToPlayer.delete(socketId);
    this.playerToRoom.delete(playerId);

    if (room.state === GAME_STATES.WAITING) {
      room.removePlayer(playerId);
      await this.registry.removeSeat(room.id, playerId);

      if (room.players.length === 0) {
        await this.registry.deleteRoom(room.id);
        this.rooms.delete(room.id);
      }
    } else {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.socketId = null;
        player.connected = false;
      }
      await this.registry.setConnected(room.id, playerId, false);
    }

    return { ok: true, room, playerId };
  }

  async handleDisconnect(socketId) {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return null;

    const room = this.rooms.get(info.roomId);
    if (!room) return null;

    const playerId = info.playerId;
    this.socketToPlayer.delete(socketId);

    if (room.state === GAME_STATES.WAITING) {
      room.removePlayer(playerId);
      this.playerToRoom.delete(playerId);
      await this.registry.removeSeat(room.id, playerId);

      if (room.players.length === 0) {
        await this.registry.deleteRoom(room.id);
        this.rooms.delete(room.id);
        return { room: null, playerId, removed: true };
      }
      return { room, playerId, removed: true };
    }

    const player = room.setPlayerDisconnected(socketId);
    await this.registry.setConnected(room.id, playerId, false);

    if (room.players.every(p => !p.connected) && room.state === GAME_STATES.WAITING) {
      await this.registry.deleteRoom(room.id);
      this.rooms.delete(room.id);
    }

    return { room, player, playerId, removed: false };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) ?? null;
  }

  async deleteRoom(roomId) {
    this.rooms.delete(roomId);
    await this.registry.deleteRoom(roomId);
  }
}

module.exports = { RoomManager };
