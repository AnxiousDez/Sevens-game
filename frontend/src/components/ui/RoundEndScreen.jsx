import { socket } from '../../socket';
import { useGameStore } from '../../store/gameStore';
import Confetti from './Confetti';

export default function RoundEndScreen() {
  const { roundResult, gameState, playerId, setScreen, setRoundResult } = useGameStore();
  if (!roundResult || !gameState) return null;

  const amHost = gameState.hostId === playerId;
  const { roundScore, gameOver, roundWinnerId, roundPot } = roundResult;
  const players = gameState.players;
  const winnerName = players.find(p => p.id === roundWinnerId)?.name;

  const sorted = Object.entries(roundScore ?? {})
    .map(([pid, score]) => ({ pid, score, name: players.find(p => p.id === pid)?.name ?? pid }))
    .sort((a, b) => a.score - b.score);

  function handleNext() {
    socket.emit('game:next_round', {}, (res) => {
      if (res.error) return alert(res.error);
      setRoundResult(null);
      setScreen('game');
    });
  }

  return (
    <div className="overlay-backdrop">
      <Confetti active intensity="normal" />
      <div className="overlay-card round-end-card">
        <h2>Round {gameState.currentRound} Complete</h2>

        {roundWinnerId && (
          <div className="pot-banner">
            <strong>{winnerName}</strong> wins the round pot of <strong>🪙 {roundPot}</strong>
            {roundWinnerId === playerId && <span className="pot-you"> (you!)</span>}
          </div>
        )}

        <p className="rejoin-hint">Room code: <strong>{gameState.roomId}</strong></p>

        <div className="round-scores">
          {sorted.map(({ pid, score, name }, i) => (
            <div key={pid} className={`score-row ${pid === playerId ? 'score-me' : ''}`}>
              <span className="score-rank">#{i + 1}</span>
              <span className="score-name">{name}{pid === playerId ? ' (you)' : ''}</span>
              <span className={`score-val ${score < 0 ? 'score-neg' : ''}`}>
                {score > 0 ? '+' : ''}{score} pts
              </span>
            </div>
          ))}
        </div>

        <div className="total-scores">
          <h3>Total Scores</h3>
          {players
            .slice()
            .sort((a, b) => a.score - b.score)
            .map((p, i) => (
              <div key={p.id} className={`score-row ${p.id === playerId ? 'score-me' : ''}`}>
                <span className="score-rank">#{i + 1}</span>
                <span className="score-name">{p.name}</span>
                <span className={`score-val ${p.score < 0 ? 'score-neg' : ''}`}>{p.score} pts</span>
              </div>
            ))}
        </div>

        {amHost && !gameOver && (
          <button className="btn-primary" onClick={handleNext}>Start Next Round</button>
        )}
        {!amHost && !gameOver && (
          <p className="waiting-msg">Waiting for host to start next round...</p>
        )}
      </div>
    </div>
  );
}
