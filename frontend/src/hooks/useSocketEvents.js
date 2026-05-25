import { useEffect } from 'react';
import { socket, refreshWallet, SERVER_URL } from '../socket';
import { useGameStore } from '../store/gameStore';
import {
  getStoredRoomId,
  getStoredSeatToken,
  setStoredRoomId,
  setStoredSeatToken,
  getLeftRoom,
  setLeftRoom,
  screenForGameState,
} from '../utils/session';

function applyGameState(state, { setGameState, setScreen }) {
  setGameState(state);
  const newScreen = screenForGameState(state.state);
  const currentScreen = useGameStore.getState().screen;
  if (newScreen !== currentScreen) {
    setScreen(newScreen);
  }
}

function saveSeatFromResponse(res) {
  if (res.seatToken) setStoredSeatToken(res.seatToken);
}

function tryRejoinRoom({ setGameState, setScreen, setError, setWallet }) {
  if (getLeftRoom()) return;

  const roomId = getStoredRoomId();
  if (!roomId) return;

  const { playerId, playerName } = useGameStore.getState();
  const seatToken = getStoredSeatToken();

  const onResult = (res) => {
    if (res.error) {
      if (res.error === 'Room not found' || res.error === 'Invalid seat token') {
        setStoredRoomId('');
        setStoredSeatToken('');
      }
      return;
    }
    setLeftRoom(false);
    setStoredRoomId(res.state.roomId);
    saveSeatFromResponse(res);
    applyGameState(res.state, { setGameState, setScreen });
    if (res.wallet) setWallet(res.wallet);
    if (res.reconnected) setError(null);
  };

  if (seatToken) {
    socket.emit('room:rejoin', { roomId, playerId, seatToken, playerName }, onResult);
  } else {
    socket.emit('room:join', { roomId, playerId, playerName }, onResult);
  }
}

export function useSocketEvents() {
  const {
    setConnected, setGameState, setScreen, setError,
    setLastPlayed, setTimerInfo, setRoundResult, setSkipEvent, setWallet,
  } = useGameStore();

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      const { playerId } = useGameStore.getState();
      refreshWallet(playerId, setWallet);
      tryRejoinRoom({ setGameState, setScreen, setError, setWallet });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => {
      setConnected(false);
      const hint = import.meta.env.VITE_SERVER_URL
        ? `Trying ${SERVER_URL} — check Railway is running and CLIENT_ORIGIN allows this site.`
        : `VITE_SERVER_URL is not set on Vercel. Add your Railway URL (https://….up.railway.app) and redeploy. Currently trying ${SERVER_URL}.`;
      setError(`Cannot reach game server — ${hint}`);
    });

    socket.on('game:state', (state) => {
      if (getLeftRoom()) return;
      const { screen } = useGameStore.getState();
      if (screen === 'home') return;
      applyGameState(state, { setGameState, setScreen });
    });

    socket.on('game:started', () => setScreen('game'));
    socket.on('game:round_started', () => setScreen('game'));

    socket.on('game:returned_to_lobby', () => {
      setRoundResult(null);
      setScreen('lobby');
    });

    socket.on('game:card_played', ({ playerId, card, auto }) => {
      setLastPlayed({ playerId, card, auto });
    });

    socket.on('game:turn_skipped', ({ playerId }) => {
      const myId = useGameStore.getState().playerId;
      if (playerId === myId) {
        setSkipEvent({ playerId, timestamp: Date.now() });
      }
    });

    socket.on('turn:timer', (info) => setTimerInfo(info));

    socket.on('round:end', (result) => {
      setRoundResult(result);
      setScreen(result.gameOver ? 'results' : 'round_end');
      if (result.gameOver) {
        const myId = useGameStore.getState().playerId;
        socket.emit('wallet:get', { playerId: myId }, (res) => {
          if (res.ok) setWallet(res.wallet);
        });
      }
    });

    socket.on('room:player_joined', () => {});
    socket.on('room:player_disconnected', () => {});
    socket.on('room:player_reconnected', () => {});
    socket.on('room:player_left', () => {});

    if (getStoredRoomId() && !getLeftRoom()) {
      if (socket.connected) {
        tryRejoinRoom({ setGameState, setScreen, setError, setWallet });
      } else {
        socket.connect();
      }
    } else {
      socket.connect();
    }

    return () => socket.removeAllListeners();
  }, []);
}
