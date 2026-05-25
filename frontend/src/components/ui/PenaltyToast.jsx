import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export default function PenaltyToast() {
  const { penaltyEvent, gameState, playerId, setPenaltyEvent } = useGameStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!penaltyEvent) return;
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); setPenaltyEvent(null); }, 3000);
    return () => clearTimeout(t);
  }, [penaltyEvent]);

  if (!visible || !penaltyEvent || !gameState) return null;

  const offenderName = gameState.players?.find(p => p.id === penaltyEvent.offender)?.name ?? 'Someone';
  const isMe = penaltyEvent.offender === playerId;
  const iBonus = penaltyEvent.others?.includes(playerId);

  return (
    <div className={`penalty-toast ${isMe ? 'toast-bad' : iBonus ? 'toast-good' : 'toast-neutral'}`}>
      {isMe && <span>⚠️ You played a 7 illegally! <strong>+10 pts</strong></span>}
      {!isMe && iBonus && <span>🎁 {offenderName} was penalized — you get <strong>−5 pts</strong>!</span>}
      {!isMe && !iBonus && <span>⚠️ {offenderName} was penalized +10 pts</span>}
    </div>
  );
}
