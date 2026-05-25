import { useEffect } from 'react';
import { socket, refreshWallet, SERVER_URL } from '../socket';
import { useGameStore } from '../store/gameStore';
import {
  getStoredRoomId,
  getLeftRoom,
  setStoredRoomId,
  setStoredSeatToken,
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
    });

    socket.on('disconnect', () => {
      setConnected(false);
      const { screen } = useGameStore.getState();
      if (screen !== 'home' && screen !== 'results') {
        setScreen('home');
        setError('Disconnected — use Join Room with your code and name to rejoin.');
      }
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      const detail = err?.message || 'connection failed';
      const hint = import.meta.env.VITE_SERVER_URL
        ? `Trying ${SERVER_URL} (${detail}). Redeploy Railway after git push, then hard-refresh.`
        : `VITE_SERVER_URL missing on Vercel. Currently trying ${SERVER_URL}.`;
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

    socket.connect();

    return () => socket.removeAllListeners();
  }, []);
}
