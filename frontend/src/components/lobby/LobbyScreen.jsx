import { useState, useEffect } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store/gameStore';
import { copyToClipboard } from '../../utils/clipboard';
import { setStoredRoomId, setStoredSeatToken, setLeftRoom } from '../../utils/session';
import ShopPanel from '../shop/ShopPanel';
import RulesPanel from '../ui/RulesPanel';

export default function LobbyScreen() {
  const { gameState, playerId, wallet, setGameState, setScreen } = useGameStore();
  const [rounds, setRounds] = useState(gameState?.players?.length ?? 3);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const playerCount = gameState?.players?.length ?? 0;

  // Keep rounds valid when players join (host often enters lobby alone with rounds=1)
  useEffect(() => {
    if (playerCount === 0) return;
    setRounds((prev) => {
      if (prev % playerCount === 0 && prev >= playerCount) return prev;
      return playerCount;
    });
  }, [playerCount]);

  if (!gameState) return null;

  const { players, config, roomId } = gameState;
  const amHost = gameState.hostId === playerId;
  const validRounds = rounds % playerCount === 0 && rounds >= playerCount;

  async function copyCode(e) {
    e?.stopPropagation?.();
    const ok = await copyToClipboard(roomId);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleStart() {
    if (!validRounds || starting) return;
    setStarting(true);
    socket.emit('game:start', { totalRounds: rounds }, (res) => {
      setStarting(false);
      if (res.error) alert(res.error);
    });
  }

  function handleLeave() {
    setLeftRoom(true);
    setStoredRoomId('');
    setStoredSeatToken('');
    socket.emit('room:leave', {}, () => {
      setGameState(null);
      setScreen('home');
    });
  }

  const ante = config.anteAmount ?? 25;
  const sessionTotal = rounds * ante;

  const roundOptions = Array.from({ length: 6 }, (_, i) => (i + 1) * playerCount).filter(r => r <= 21);

  return (
    <div className="lobby-screen">
      {showShop && <ShopPanel onClose={() => setShowShop(false)} />}
      {showRules && <RulesPanel onClose={() => setShowRules(false)} />}

      <div className="lobby-topbar">
        {wallet && <span className="lobby-wallet">🪙 {wallet.coins}</span>}
        <button type="button" className="btn-shop-link" onClick={() => setShowShop(true)}>Shop</button>
        <button type="button" className="btn-rules-link" onClick={() => setShowRules(true)}>Rules</button>
        <button type="button" className="btn-leave" onClick={handleLeave}>Leave</button>
      </div>

      <div className="lobby-header">
        <h2>Game Lobby</h2>
        <p className="lobby-subtitle">Share the room code — disconnected players can rejoin here</p>
        <div className="room-code-block">
          <span className="room-label">Room Code</span>
          <div className="room-code" onClick={copyCode} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && copyCode(e)}>
            <span>{roomId}</span>
            <button type="button" className="copy-btn" onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
          </div>
          <p className="share-hint">Share this code with friends to join</p>
        </div>
      </div>

      <div className="lobby-body">
        <div className="players-section">
          <h3>Players <span className="count">{playerCount} / {config.maxPlayers}</span></h3>
          <div className="player-list">
            {players.map((p, i) => (
              <div key={p.id} className={`player-row ${p.id === playerId ? 'me' : ''} ${!p.connected ? 'disconnected' : ''}`}>
                <div className="player-avatar">{p.name[0]?.toUpperCase()}</div>
                <span className="player-name">{p.name}{p.id === playerId ? ' (you)' : ''}</span>
                {gameState.hostId === p.id && <span className="host-badge">HOST</span>}
                {!p.connected && <span className="dc-badge">Disconnected</span>}
              </div>
            ))}
            {Array.from({ length: config.maxPlayers - playerCount }).map((_, i) => (
              <div key={`empty-${i}`} className="player-row empty">
                <div className="player-avatar empty-avatar">?</div>
                <span className="player-name muted">Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

        <div className="config-section">
          <h3>Game Settings</h3>
          <div className="config-item">
            <span>Turn Timer</span>
            <strong>{config.turnTimerSeconds}s</strong>
          </div>
          <div className="config-item">
            <span>Round entry</span>
            <strong>🪙 {ante} each</strong>
          </div>
          <div className="config-item">
            <span>Match bankroll</span>
            <strong>🪙 {sessionTotal} per player</strong>
          </div>
          <p className="rounds-hint">Round winner takes the pot. Winnings become shop coins after the match.</p>

          {amHost && (
            <div className="rounds-config">
              <label>Number of Rounds</label>
              <div className="rounds-options">
                {roundOptions.map(r => (
                  <button
                    key={r}
                    className={`round-btn ${rounds === r ? 'selected' : ''}`}
                    onClick={() => setRounds(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="rounds-hint">Must be a multiple of {playerCount} (number of players)</p>
            </div>
          )}

          {!amHost && (
            <div className="rounds-display">
              <span>Rounds</span>
              <strong>{rounds}</strong>
            </div>
          )}
        </div>
      </div>

      {amHost && (
        <div className="lobby-footer">
          {playerCount < config.minPlayers && (
            <p className="waiting-msg">Waiting for at least {config.minPlayers} players...</p>
          )}
          {playerCount >= config.minPlayers && !validRounds && (
            <p className="waiting-msg">Select a number of rounds above to start</p>
          )}
          <button
            className="btn-start"
            disabled={playerCount < config.minPlayers || !validRounds || starting}
            onClick={handleStart}
          >
            {starting ? 'Starting...' : `Start Game (${playerCount} players, ${rounds} rounds)`}
          </button>
        </div>
      )}

      {!amHost && (
        <div className="lobby-footer">
          <p className="waiting-msg">Waiting for host to start the game...</p>
        </div>
      )}
    </div>
  );
}
