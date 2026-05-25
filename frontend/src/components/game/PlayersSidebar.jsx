import { useGameStore } from '../../store/gameStore';
import { SUIT_SYMBOLS } from '../../utils/cards';

export default function PlayersSidebar() {
  const { gameState, playerId } = useGameStore();
  if (!gameState) return null;

  const { players, currentPlayer, turnOrder, economy } = gameState;
  const me = players.find(p => p.id === playerId);

  return (
    <div className="players-sidebar">
      <h3 className="sidebar-title">Players</h3>
      {economy && (
        <div className="sidebar-economy">
          <div className="economy-pot">Pot: 🪙 {economy.currentPot}</div>
          {me?.sessionBankroll != null && (
            <div className="economy-bankroll">You: 🪙 {me.sessionBankroll}</div>
          )}
        </div>
      )}
      {(turnOrder ?? players.map(p => p.id)).map((pid, seatIdx) => {
        const player = players.find(p => p.id === pid);
        if (!player) return null;
        const isActive = currentPlayer === pid;
        const isMe = pid === playerId;

        return (
          <div
            key={pid}
            className={[
              'sidebar-player',
              isActive ? 'player-active' : '',
              isMe ? 'player-me' : '',
              !player.connected ? 'player-dc' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className="sidebar-avatar">{player.name[0]?.toUpperCase()}</div>
            <div className="sidebar-info">
              <div className="sidebar-name">
                {player.name}
                {isMe && <span className="me-tag"> (you)</span>}
                {!player.connected && <span className="dc-tag"> ✗</span>}
              </div>
              <div className="sidebar-stats">
                <span className="card-count">{player.cardCount ?? '?'} cards</span>
                <span className="score">Score: {player.score ?? 0}</span>
                {player.sessionBankroll != null && (
                  <span className="bankroll">🪙 {player.sessionBankroll}</span>
                )}
                {(player.roundWinnings ?? 0) > 0 && (
                  <span className="round-wins">+🪙{player.roundWinnings}</span>
                )}
              </div>
            </div>
            {isActive && <div className="turn-arrow">▶</div>}
          </div>
        );
      })}
    </div>
  );
}
