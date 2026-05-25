import { useState, useEffect, useRef } from 'react';
import Card from './Card';
import { isValidMove as checkValid } from '../../utils/cards';
import { socket } from '../../socket';
import { useGameStore } from '../../store/gameStore';

/** Flat scrollable row on phones (especially landscape) so every card stays reachable */
function useCompactHand() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      '(max-width: 640px), (orientation: landscape) and (max-height: 520px)'
    );
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return compact;
}

function getFanTransform(index, total, lift = 0, compact = false) {
  if (total <= 0) return { transform: `translateY(${lift}px)`, zIndex: 0 };

  if (compact) {
    return {
      transform: `translateY(${lift}px)`,
      zIndex: index + 1,
    };
  }

  const center = (total - 1) / 2;
  const offset = index - center;
  const maxAngle = Math.min(6 + total * 2.2, 32);
  const rotation = total === 1 ? 0 : (-maxAngle / 2) + (index * maxAngle / (total - 1));
  const arcDrop = Math.pow(Math.abs(offset) / Math.max(center, 1), 1.6) * 10;

  return {
    transform: `rotate(${rotation}deg) translateY(${arcDrop + lift}px)`,
    zIndex: index + 1,
  };
}

export default function PlayerHand() {
  const { gameState, playerId, wallet } = useGameStore();
  const compact = useCompactHand();
  const cardTheme = wallet?.equippedCards ?? 'cards-default';
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(false);
  const fanRef = useRef(null);

  useEffect(() => {
    if (!compact || !selected || !fanRef.current) return;
    const el = fanRef.current.querySelector('.hand-card-selected');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selected, compact]);

  const hand = gameState?.hand ?? [];
  const validMoves = gameState?.validMoves ?? [];
  const isMyTurn = gameState?.currentPlayer === playerId;
  const isFirstTurn = Object.values(gameState?.board ?? {}).every((range) => range === null);
  const mustPlaySevenSpades = isFirstTurn
    && validMoves.length === 1
    && validMoves[0]?.suit === 'spades'
    && validMoves[0]?.value === 7;

  function handleCardClick(card) {
    if (!isMyTurn) return;
    const valid = checkValid(card, validMoves);
    if (!valid) return;

    if (selected && selected.suit === card.suit && selected.value === card.value) {
      playCard(card);
    } else {
      setSelected(card);
    }
  }

  function playCard(card) {
    if (playing) return;
    setPlaying(true);
    socket.emit('game:play_card', { card }, (res) => {
      setPlaying(false);
      setSelected(null);
      if (res.error) alert(res.error);
    });
  }

  return (
    <div className="player-hand-container">
      <div className="hand-label">
        {isMyTurn
          ? validMoves.length > 0
            ? mustPlaySevenSpades
              ? <span className="your-turn-label">First turn — you must play 7♠</span>
              : <span className="your-turn-label">Your Turn — tap a card to select, tap again to play</span>
            : <span className="skip-label">No valid moves — your turn will be skipped</span>
          : <span className="wait-label">Your Hand ({hand.length} cards)</span>
        }
      </div>

      {compact && hand.length > 5 && (
        <p className="hand-scroll-hint">Swipe sideways to see all cards →</p>
      )}

      <div ref={fanRef} className={`player-hand-fan${compact ? ' player-hand-fan--scroll' : ''}`}>
        {hand.map((card, i) => {
          const valid = checkValid(card, validMoves);
          const isSel = selected?.suit === card.suit && selected?.value === card.value;
          const lift = isSel ? (compact ? -20 : -48) : (isMyTurn && valid ? (compact ? -10 : -24) : 0);
          const fan = getFanTransform(i, hand.length, lift, compact);

          return (
            <div
              key={`${card.suit}-${card.value}`}
              className={[
                'hand-card-wrap',
                isMyTurn && valid ? 'hand-card-valid' : '',
                isSel ? 'hand-card-selected' : '',
              ].filter(Boolean).join(' ')}
              style={{
                transform: fan.transform,
                zIndex: isSel ? 200 : fan.zIndex,
              }}
            >
              <Card
                card={card}
                themeId={cardTheme}
                selectable={isMyTurn && valid}
                selected={isSel}
                onClick={() => handleCardClick(card)}
              />
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="play-confirm">
          <button className="btn-play" onClick={() => playCard(selected)} disabled={playing}>
            {playing ? 'Playing...' : 'Play selected card'}
          </button>
          <button className="btn-cancel" onClick={() => setSelected(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
