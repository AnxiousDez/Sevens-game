import { io } from 'socket.io-client';

/** Use page hostname so shop/wallet work when your network IP changes day to day. */
function resolveServerUrl() {
  const configured = import.meta.env.VITE_SERVER_URL?.trim();
  if (configured) return configured;
  return `http://${window.location.hostname}:3001`;
}

export const SERVER_URL = resolveServerUrl();

export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export function refreshWallet(playerId, setWallet) {
  socket.emit('wallet:get', { playerId }, (res) => {
    if (res?.ok) setWallet(res.wallet);
  });
}
