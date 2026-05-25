import { useState, useEffect } from 'react';
import { socket, refreshWallet } from '../../socket';
import { useGameStore } from '../../store/gameStore';
import { setStoredRoomId, setStoredSeatToken, screenForGameState, setLeftRoom } from '../../utils/session';
import ShopPanel from '../shop/ShopPanel';
import RulesPanel from '../ui/RulesPanel';

export default function HomeScreen() {
  const { playerId, playerName, setPlayerName, setGameState, setScreen, setError, wallet, setWallet } = useGameStore();
  const [name, setName] = useState(playerName);
  const [roomCode, setRoomCode] = useState('');
  const [tab, setTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [config, setConfig] = useState({ maxPlayers: 4, minPlayers: 3, turnTimerSeconds: 30 });

  const ready = name.trim().length >= 2;

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const loadWallet = () => refreshWallet(playerId, setWallet);
    if (socket.connected) loadWallet();
    else socket.once('connect', loadWallet);
  }, [playerId, setWallet]);

  function connect(cb) {
    setPlayerName(name.trim());
    if (!socket.connected) {
      socket.connect();
      socket.once('connect', cb);
    } else {
      cb();
    }
  }

  function handleCreate() {
    if (!ready || loading) return;
    setLoading(true);
    connect(() => {
      socket.emit('room:create', { playerId, playerName: name.trim(), config }, (res) => {
        setLoading(false);
        if (res.error) return setError(res.error);
        setLeftRoom(false);
        setStoredRoomId(res.state.roomId);
        if (res.seatToken) setStoredSeatToken(res.seatToken);
        if (res.wallet) setWallet(res.wallet);
        setGameState(res.state);
        setScreen(screenForGameState(res.state.state));
      });
    });
  }

  function handleJoin() {
    if (!ready || !roomCode.trim() || loading) return;
    setLoading(true);
    connect(() => {
      socket.emit('room:join', { roomId: roomCode.trim().toUpperCase(), playerId, playerName: name.trim() }, (res) => {
        setLoading(false);
        if (res.error) return setError(res.error);
        setLeftRoom(false);
        setStoredRoomId(res.state.roomId);
        if (res.seatToken) setStoredSeatToken(res.seatToken);
        if (res.wallet) setWallet(res.wallet);
        setGameState(res.state);
        setScreen(screenForGameState(res.state.state));
      });
    });
  }

  return (
    <div className="home-screen">
      {showShop && <ShopPanel onClose={() => setShowShop(false)} />}
      {showRules && <RulesPanel onClose={() => setShowRules(false)} />}

      <div className="home-hero">
        <div className="suit-bg">♠ ♥ ♦ ♣</div>
        <h1 className="game-title">SEVENS</h1>
        <p className="game-subtitle">The strategic card game</p>
        <div className="home-actions">
          <div className="home-wallet">
            <span>🪙 {wallet ? wallet.coins : '—'} coins</span>
            <button type="button" className="btn-shop-link" onClick={() => setShowShop(true)}>Shop</button>
          </div>
          <button type="button" className="btn-rules-link" onClick={() => setShowRules(true)}>How to Play</button>
        </div>
      </div>

      <div className="home-card">
        <div className="name-field">
          <label>Your Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            onKeyDown={e => e.key === 'Enter' && (tab === 'join' ? handleJoin() : handleCreate())}
          />
        </div>

        <div className="tab-bar">
          <button className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>Create Room</button>
          <button className={tab === 'join' ? 'active' : ''} onClick={() => setTab('join')}>Join Room</button>
        </div>

        {tab === 'create' && (
          <div className="create-form">
            <div className="config-row">
              <label>Players <span className="hint">(3–7)</span></label>
              <div className="stepper">
                <button onClick={() => setConfig(c => ({ ...c, maxPlayers: Math.max(3, c.maxPlayers - 1) }))}>−</button>
                <span>{config.maxPlayers}</span>
                <button onClick={() => setConfig(c => ({ ...c, maxPlayers: Math.min(7, c.maxPlayers + 1) }))}>+</button>
              </div>
            </div>
            <div className="config-row">
              <label>Turn Timer <span className="hint">(seconds)</span></label>
              <div className="stepper">
                <button onClick={() => setConfig(c => ({ ...c, turnTimerSeconds: Math.max(10, c.turnTimerSeconds - 5) }))}>−</button>
                <span>{config.turnTimerSeconds}s</span>
                <button onClick={() => setConfig(c => ({ ...c, turnTimerSeconds: Math.min(60, c.turnTimerSeconds + 5) }))}>+</button>
              </div>
            </div>
            <button className="btn-primary" disabled={!ready || loading} onClick={handleCreate}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="join-form">
            <input
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Room Code (e.g. AB3X9Y)"
              maxLength={6}
              className="code-input"
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <p className="join-hint">Reconnecting? Use the same name you joined with.</p>
            <button className="btn-primary" disabled={!ready || !roomCode.trim() || loading} onClick={handleJoin}>
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
