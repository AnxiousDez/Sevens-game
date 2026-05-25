const { RoomManager } = require('./roomManager');
const { TimerManager } = require('./timerManager');
const { WalletManager } = require('../wallet/walletManager');
const { GAME_STATES } = require('../game/constants');

const roomManager = new RoomManager();
const timerManager = new TimerManager();
const walletManager = new WalletManager();

function broadcastRoomState(io, room) {
  room.players.forEach(player => {
    if (player.socketId) {
      io.to(player.socketId).emit('game:state', room.getPublicState(player.id));
    }
  });
}

function sendActiveTimer(io, room, socketId) {
  if (room.state !== GAME_STATES.PLAYING) return;
  const timer = timerManager.getTimerInfo(room.id);
  if (!timer) return;
  io.to(socketId).emit('turn:timer', {
    playerId: room.getCurrentPlayer(),
    duration: timer.duration,
    startedAt: timer.startedAt,
  });
}

function startTurnTimer(io, room) {
  const playerId = room.getCurrentPlayer();
  const duration = room.config.turnTimerSeconds;

  io.to(room.id).emit('turn:timer', {
    playerId,
    duration,
    startedAt: Date.now(),
  });

  timerManager.start(room.id, duration, () => {
    const result = room.autoPlay(playerId);
    if (result.error) return;

    io.to(room.id).emit('game:card_played', {
      playerId,
      card: result.autoCard ?? null,
      auto: true,
    });

    if (result.roundOver) {
      handleRoundEnd(io, room, result);
    } else {
      broadcastRoomState(io, room);
      beginTurn(io, room);
    }
  });
}

function beginTurn(io, room) {
  timerManager.clear(room.id);
  if (room.state !== GAME_STATES.PLAYING) return;

  const visited = new Set();

  while (true) {
    const playerId = room.getCurrentPlayer();
    if (room.getValidMovesForPlayer(playerId).length > 0) {
      startTurnTimer(io, room);
      return;
    }

    if (visited.has(playerId)) {
      startTurnTimer(io, room);
      return;
    }
    visited.add(playerId);

    const result = room.skipTurn(playerId);
    if (result.error) return;

    io.to(room.id).emit('game:turn_skipped', { playerId });
    broadcastRoomState(io, room);
  }
}

function syncTurnAfterReconnect(io, room, socketId) {
  sendActiveTimer(io, room, socketId);
}

async function handleRoundEnd(io, room, result) {
  timerManager.clear(room.id);

  let coinPayouts = null;
  if (result.gameOver && result.matchWinnings) {
    coinPayouts = [];
    for (const [pid, amount] of Object.entries(result.matchWinnings)) {
      if (amount > 0) {
        await walletManager.addCoins(pid, amount);
        coinPayouts.push({
          playerId: pid,
          amount,
          name: room.players.find(p => p.id === pid)?.name,
        });
      }
    }
  }

  io.to(room.id).emit('round:end', {
    roundScore: result.roundScore,
    gameOver: result.gameOver,
    finalScores: result.finalScores ?? null,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    roundWinnerId: result.roundWinnerId ?? null,
    roundPot: result.roundPot ?? 0,
    coinPayouts,
    matchWinnings: result.matchWinnings ?? null,
  });

  broadcastRoomState(io, room);
}

module.exports = function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('room:create', async ({ playerId, playerName, config }, cb) => {
      try {
        await walletManager.touch(playerId);
        const { room, seatToken } = await roomManager.createRoom(socket.id, playerId, playerName, config);
        socket.join(room.id);
        cb({
          ok: true,
          roomId: room.id,
          seatToken,
          state: room.getPublicState(playerId),
          wallet: await walletManager.getPublicWallet(playerId),
        });
        console.log(`Room created: ${room.id} by ${playerName}`);
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('room:join', async ({ roomId, playerId, playerName, seatToken }, cb) => {
      try {
        await walletManager.touch(playerId);
        const result = await roomManager.joinRoom(
          roomId.toUpperCase(),
          socket.id,
          playerId,
          playerName,
          seatToken || null
        );
        if (result.error) return cb({ error: result.error });

        const { room, reconnected, seatToken: token } = result;
        socket.join(room.id);

        if (reconnected) {
          socket.to(room.id).emit('room:player_reconnected', { playerId });
        } else {
          socket.to(room.id).emit('room:player_joined', {
            player: { id: playerId, name: playerName },
          });
        }

        cb({
          ok: true,
          seatToken: token,
          state: room.getPublicState(playerId),
          reconnected,
          wallet: await walletManager.getPublicWallet(playerId),
        });
        syncTurnAfterReconnect(io, room, socket.id);
        broadcastRoomState(io, room);
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('room:rejoin', async ({ roomId, playerId, seatToken, playerName }, cb) => {
      try {
        await walletManager.touch(playerId);
        const result = await roomManager.rejoinRoom(
          roomId.toUpperCase(),
          socket.id,
          playerId,
          seatToken,
          playerName
        );
        if (result.error) return cb({ error: result.error });

        const { room, seatToken: token } = result;
        socket.join(room.id);

        socket.to(room.id).emit('room:player_reconnected', { playerId });
        cb({
          ok: true,
          seatToken: token,
          state: room.getPublicState(playerId),
          wallet: await walletManager.getPublicWallet(playerId),
        });
        syncTurnAfterReconnect(io, room, socket.id);
        broadcastRoomState(io, room);
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('room:reconnect', async ({ roomId, playerId, seatToken, playerName }, cb) => {
      try {
        if (!seatToken) {
          return cb({ error: 'Seat token required — use room:rejoin' });
        }
        const result = await roomManager.rejoinRoom(
          roomId.toUpperCase(),
          socket.id,
          playerId,
          seatToken,
          playerName
        );
        if (result.error) return cb({ error: result.error });

        const { room, seatToken: token } = result;
        socket.join(room.id);

        socket.to(room.id).emit('room:player_reconnected', { playerId });
        cb({
          ok: true,
          seatToken: token,
          state: room.getPublicState(playerId),
          wallet: await walletManager.getPublicWallet(playerId),
        });
        syncTurnAfterReconnect(io, room, socket.id);
        broadcastRoomState(io, room);
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('room:get_state', ({}, cb) => {
      const info = roomManager.getPlayerBySocket(socket.id);
      if (!info) return cb({ error: 'Not in a room' });
      const room = roomManager.getRoom(info.roomId);
      if (!room) return cb({ error: 'Room not found' });
      cb({ ok: true, state: room.getPublicState(info.playerId) });
    });

    socket.on('room:leave', async ({}, cb) => {
      try {
        const result = await roomManager.leaveRoom(socket.id);
        if (result.error) return cb({ error: result.error });

        if (result.room) {
          socket.leave(result.room.id);
          socket.to(result.room.id).emit('room:player_left', { playerId: result.playerId });
          if (result.room.state === GAME_STATES.WAITING) {
            broadcastRoomState(io, result.room);
          }
        }

        cb({ ok: true });
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('wallet:get', async ({ playerId }, cb) => {
      try {
        if (!playerId) return cb({ error: 'Player ID required' });
        cb({ ok: true, wallet: await walletManager.getPublicWallet(playerId) });
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('shop:buy', async ({ playerId, type, itemId }, cb) => {
      try {
        const result = await walletManager.buy(playerId, type, itemId);
        if (result.error) return cb({ error: result.error });
        cb({ ok: true, wallet: result.wallet });
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('shop:equip', async ({ playerId, type, itemId }, cb) => {
      try {
        const result = await walletManager.equip(playerId, type, itemId);
        if (result.error) return cb({ error: result.error });
        cb({ ok: true, wallet: result.wallet });
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('game:start', async ({ totalRounds }, cb) => {
      try {
        const info = roomManager.getPlayerBySocket(socket.id);
        if (!info) return cb({ error: 'Not in a room' });

        const room = roomManager.getRoom(info.roomId);
        if (!room) return cb({ error: 'Room not found' });
        if (room.hostId !== info.playerId) return cb({ error: 'Only host can start the game' });

        const result = room.startGame(totalRounds);
        if (result.error) return cb({ error: result.error });

        await roomManager.lockRoom(room.id);

        cb({ ok: true });
        broadcastRoomState(io, room);

        io.to(room.id).emit('game:started', {
          turnOrder: room.turnOrder,
          currentPlayer: room.getCurrentPlayer(),
          round: room.currentRound,
          totalRounds: room.totalRounds,
        });

        beginTurn(io, room);
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('game:play_card', ({ card }, cb) => {
      try {
        const info = roomManager.getPlayerBySocket(socket.id);
        if (!info) return cb({ error: 'Not in a room' });

        const room = roomManager.getRoom(info.roomId);
        if (!room) return cb({ error: 'Room not found' });

        const result = room.playCard(info.playerId, card);
        if (result.error) return cb({ error: result.error });

        timerManager.clear(room.id);

        io.to(room.id).emit('game:card_played', {
          playerId: info.playerId,
          card,
          auto: false,
        });

        cb({ ok: true });

        if (result.roundOver) {
          handleRoundEnd(io, room, result);
        } else {
          broadcastRoomState(io, room);
          beginTurn(io, room);
        }
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('game:next_round', ({}, cb) => {
      try {
        const info = roomManager.getPlayerBySocket(socket.id);
        if (!info) return cb({ error: 'Not in a room' });

        const room = roomManager.getRoom(info.roomId);
        if (!room) return cb({ error: 'Room not found' });
        if (room.hostId !== info.playerId) return cb({ error: 'Only host can start next round' });

        const result = room.startNextRound();
        if (result.error) return cb({ error: result.error });

        cb({ ok: true });
        broadcastRoomState(io, room);

        io.to(room.id).emit('game:round_started', {
          round: room.currentRound,
          currentPlayer: room.getCurrentPlayer(),
        });

        beginTurn(io, room);
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('game:update_config', ({ config }, cb) => {
      try {
        const info = roomManager.getPlayerBySocket(socket.id);
        if (!info) return cb({ error: 'Not in a room' });
        const room = roomManager.getRoom(info.roomId);
        if (!room) return cb({ error: 'Room not found' });
        if (room.hostId !== info.playerId) return cb({ error: 'Only host can update config' });
        if (room.state !== GAME_STATES.WAITING) return cb({ error: 'Cannot update config after game starts' });

        room.config = { ...room.config, ...config };
        cb({ ok: true });
        broadcastRoomState(io, room);
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('game:play_again', async ({}, cb) => {
      try {
        const info = roomManager.getPlayerBySocket(socket.id);
        if (!info) return cb({ error: 'Not in a room' });

        const room = roomManager.getRoom(info.roomId);
        if (!room) return cb({ error: 'Room not found' });

        if (room.state === GAME_STATES.GAME_END) {
          const result = room.returnToLobby();
          if (result.error) return cb({ error: result.error });
          await roomManager.unlockRoom(room.id);
        } else if (room.state !== GAME_STATES.WAITING) {
          return cb({ error: 'Cannot start a new game yet' });
        }

        const state = room.getPublicState(info.playerId);
        cb({ ok: true, state });

        io.to(room.id).emit('game:returned_to_lobby');
        broadcastRoomState(io, room);
      } catch (e) {
        cb({ error: e.message });
      }
    });

    socket.on('disconnect', async () => {
      const result = await roomManager.handleDisconnect(socket.id);
      if (!result) return;

      const { room, playerId } = result;
      console.log(`Player ${playerId} disconnected from room ${room?.id}`);

      if (room) {
        if (result.removed) {
          socket.to(room.id).emit('room:player_left', { playerId });
          if (room.state === GAME_STATES.WAITING) {
            broadcastRoomState(io, room);
          }
          return;
        }

        socket.to(room.id).emit('room:player_disconnected', { playerId });

        if (room.state === GAME_STATES.GAME_END) return;

        broadcastRoomState(io, room);

        if (room.state === GAME_STATES.PLAYING && room.getCurrentPlayer() === playerId) {
          const validMoves = room.getValidMovesForPlayer(playerId);
          if (validMoves.length === 0) {
            beginTurn(io, room);
          }
        }
      }
    });
  });
};
