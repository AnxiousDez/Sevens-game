const ROOM_KEY = 'sevens_room_id';
const SEAT_TOKEN_KEY = 'sevens_seat_token';
const LEFT_ROOM_KEY = 'sevens_left_room';

export function getStoredRoomId() {
  return localStorage.getItem(ROOM_KEY)
    || sessionStorage.getItem(ROOM_KEY)
    || '';
}

export function setStoredRoomId(roomId) {
  if (roomId) {
    localStorage.setItem(ROOM_KEY, roomId);
    sessionStorage.setItem(ROOM_KEY, roomId);
  } else {
    localStorage.removeItem(ROOM_KEY);
    sessionStorage.removeItem(ROOM_KEY);
  }
}

export function getStoredSeatToken() {
  return localStorage.getItem(SEAT_TOKEN_KEY)
    || sessionStorage.getItem(SEAT_TOKEN_KEY)
    || '';
}

export function setStoredSeatToken(token) {
  if (token) {
    localStorage.setItem(SEAT_TOKEN_KEY, token);
    sessionStorage.setItem(SEAT_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(SEAT_TOKEN_KEY);
    sessionStorage.removeItem(SEAT_TOKEN_KEY);
  }
}

/** Saved room from a prior session — user must tap Join (no auto-rejoin) */
export function hasPendingRejoin() {
  return !!getStoredRoomId() && !getLeftRoom();
}

export function clearSession() {
  setStoredRoomId('');
  setStoredSeatToken('');
}

export function getLeftRoom() {
  return localStorage.getItem(LEFT_ROOM_KEY) === '1';
}

export function setLeftRoom(left) {
  if (left) localStorage.setItem(LEFT_ROOM_KEY, '1');
  else localStorage.removeItem(LEFT_ROOM_KEY);
}

export function screenForGameState(state) {
  switch (state) {
    case 'waiting': return 'lobby';
    case 'playing': return 'game';
    case 'round_end': return 'round_end';
    case 'game_end': return 'results';
    default: return 'home';
  }
}
