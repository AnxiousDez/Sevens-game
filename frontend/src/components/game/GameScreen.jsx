import GameBoard from './GameBoard';
import PlayerHand from './PlayerHand';
import PlayersSidebar from './PlayersSidebar';
import TurnTimer from './TurnTimer';
import RoomCodeDisplay from '../ui/RoomCodeDisplay';
import SkipToast from '../ui/SkipToast';
import RulesPanel from '../ui/RulesPanel';
import { useGameStore } from '../../store/gameStore';
import { useState } from 'react';

export default function GameScreen() {
  const { gameState, wallet } = useGameStore();
  const [showRules, setShowRules] = useState(false);
  if (!gameState) return null;

  const { currentRound, totalRounds, roomId } = gameState;
  const boardTheme = wallet?.equippedBoard ?? 'board-default';
  const cardTheme = wallet?.equippedCards ?? 'cards-default';

  return (
    <div className={`game-screen theme-${boardTheme}`}>
      {showRules && <RulesPanel onClose={() => setShowRules(false)} />}
      <div className="game-topbar">
        <div className="round-info">Round {currentRound} / {totalRounds}</div>
        <RoomCodeDisplay roomId={roomId} compact />
        <button type="button" className="btn-rules-compact" onClick={() => setShowRules(true)}>?</button>
        <TurnTimer />
      </div>

      <div className="game-layout">
        <PlayersSidebar />

        <div className="game-center">
          <div className="game-play-stack">
            <GameBoard board={gameState.board} theme={boardTheme} />
            <div className={`hand-theme-wrap ${cardTheme}`}>
              <PlayerHand />
            </div>
          </div>
        </div>
      </div>

      <SkipToast />
    </div>
  );
}
