import { create } from 'zustand';

function getOrCreatePlayerId() {
  let id = localStorage.getItem('sevens_player_id');
  if (!id) id = sessionStorage.getItem('sevens_player_id');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
  localStorage.setItem('sevens_player_id', id);
  sessionStorage.setItem('sevens_player_id', id);
  return id;
}

function getOrCreatePlayerName() {
  return localStorage.getItem('sevens_player_name')
    || sessionStorage.getItem('sevens_player_name')
    || '';
}

export const useGameStore = create((set, get) => ({
  playerId: getOrCreatePlayerId(),
  playerName: getOrCreatePlayerName(),
  setPlayerName: (name) => {
    localStorage.setItem('sevens_player_name', name);
    sessionStorage.setItem('sevens_player_name', name);
    set({ playerName: name });
  },

  connected: false,
  setConnected: (v) => set({ connected: v }),

  gameState: null,
  setGameState: (state) => set({ gameState: state }),

  screen: 'home',
  setScreen: (s) => set({ screen: s }),

  error: null,
  setError: (e) => set({ error: e }),

  lastPlayed: null,
  setLastPlayed: (c) => set({ lastPlayed: c }),

  timerInfo: null,
  setTimerInfo: (t) => set({ timerInfo: t }),

  roundResult: null,
  setRoundResult: (r) => set({ roundResult: r }),

  skipEvent: null,
  setSkipEvent: (e) => set({ skipEvent: e }),

  wallet: null,
  setWallet: (w) => set({ wallet: w }),
}));
