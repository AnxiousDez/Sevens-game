import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export default function TurnTimer() {
  const { timerInfo, gameState, playerId } = useGameStore();
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!timerInfo) return;
    const { startedAt, duration } = timerInfo;

    function tick() {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
    }

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [timerInfo]);

  if (!timerInfo || remaining === null || !gameState) return null;

  const currentPlayer = gameState.players?.find(p => p.id === timerInfo.playerId);
  const isMe = timerInfo.playerId === playerId;
  const pct = remaining / timerInfo.duration;
  const urgent = pct < 0.3;

  return (
    <div className={`turn-timer ${isMe ? 'timer-mine' : ''} ${urgent ? 'timer-urgent' : ''}`}>
      <div className="timer-name">{isMe ? 'Your turn' : `${currentPlayer?.name || 'Player'}'s turn`}</div>
      <div className="timer-bar-wrap">
        <div className="timer-bar" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="timer-seconds">{Math.ceil(remaining)}s</div>
    </div>
  );
}
