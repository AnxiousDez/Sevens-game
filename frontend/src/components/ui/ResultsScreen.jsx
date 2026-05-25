import { useState, useEffect } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store/gameStore';
import { setStoredRoomId, setStoredSeatToken, setLeftRoom } from '../../utils/session';
import Confetti from './Confetti';
import ShopPanel from '../shop/ShopPanel';

export default function ResultsScreen() {
  const { roundResult, gameState, playerId, setScreen, setGameState, setRoundResult, wallet, setWallet } = useGameStore();
  const [loading, setLoading] = useState(null);
  const [showShop, setShowShop] = useState(false);

  useEffect(() => {
    socket.emit('wallet:get', { playerId }, (res) => {
      if (res.ok) setWallet(res.wallet);
    });
  }, [playerId, setWallet]);

  if (!gameState) return null;

  const finalScores = roundResult?.finalScores ?? gameState.players
    ?.slice()
    .sort((a, b) => a.score - b.score)
    .map(p => ({ id: p.id, name: p.name, score: p.score }));

  const winner = finalScores?.[0];
  const iWon = winner?.id === playerId;
  const myPayout = roundResult?.coinPayouts?.find(p => p.playerId === playerId);
  const matchWinnings = roundResult?.matchWinnings ?? {};

  function handleExit() {
    if (loading) return;
    setLoading('exit');
    setLeftRoom(true);
    setStoredRoomId('');
    setStoredSeatToken('');
    socket.emit('room:leave', {}, () => {
      setGameState(null);
      setRoundResult(null);
      setScreen('home');
      setLoading(null);
      socket.emit('wallet:get', { playerId }, (res) => { if (res.ok) setWallet(res.wallet); });
    });
  }

  function handlePlayAgain() {
    if (loading) return;
    setLoading('again');
    setLeftRoom(false);
    socket.emit('game:play_again', {}, (res) => {
      setLoading(null);
      if (res.error) return alert(res.error);
      setRoundResult(null);
      if (res.state) {
        setStoredRoomId(res.state.roomId);
        setGameState(res.state);
      }
      setScreen('lobby');
    });
  }

  return (
    <div className="results-screen">
      {showShop && <ShopPanel onClose={() => setShowShop(false)} />}
      <Confetti active intensity="heavy" />

      <div className="results-hero">
        <div className="trophy">🏆</div>
        <h1 className="winner-name">{winner?.name ?? '?'} Wins!</h1>
        <p className="winner-sub">{iWon ? 'Congratulations! 🎉' : 'Better luck next time!'}</p>
      </div>

      {myPayout && (
        <div className="payout-banner">
          You earned <strong>🪙 {myPayout.amount}</strong> shop coins from round wins!
          {wallet && <span className="payout-balance"> Balance: 🪙 {wallet.coins}</span>}
        </div>
      )}

      <div className="final-ranking">
        <h2>Final Ranking</h2>
        {finalScores?.map((p, i) => (
          <div key={p.id} className={`rank-row ${p.id === playerId ? 'rank-me' : ''} ${i === 0 ? 'rank-first' : ''}`}>
            <span className="rank-pos">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
            <span className="rank-name">{p.name}{p.id === playerId ? ' (you)' : ''}</span>
            <span className="rank-extra">
              {matchWinnings[p.id] > 0 && <span className="round-win-coins">+🪙{matchWinnings[p.id]}</span>}
              <span className={`rank-score ${p.score < 0 ? 'score-neg' : ''}`}>{p.score} pts</span>
            </span>
          </div>
        ))}
      </div>

      <div className="results-footer">
        <p className="scoring-note">Round wins earn shop coins • Spend them in the Shop</p>
        <p className="rejoin-hint">Room code: <strong>{gameState.roomId}</strong></p>
        <div className="results-actions">
          <button className="btn-secondary" disabled={!!loading} onClick={handleExit}>
            {loading === 'exit' ? 'Leaving...' : 'Exit'}
          </button>
          <button className="btn-secondary" disabled={!!loading} onClick={() => setShowShop(true)}>Shop</button>
          <button className="btn-primary" disabled={!!loading} onClick={handlePlayAgain}>
            {loading === 'again' ? 'Joining lobby...' : 'Play Again'}
          </button>
        </div>
      </div>
    </div>
  );
}
