import { useLayoutEffect, useRef } from 'react';
import { SUIT_SYMBOLS } from '../../utils/cards';

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const isRed = s => s === 'hearts' || s === 'diamonds';

function cardLabel(v) {
  if (v === 1) return 'A';
  if (v === 11) return 'J';
  if (v === 12) return 'Q';
  if (v === 13) return 'K';
  return String(v);
}

function BoardRow({ suit, range }) {
  const symbol = SUIT_SYMBOLS[suit];
  const red = isRed(suit);
  const slots = Array.from({ length: 13 }, (_, i) => i + 1);
  const low = range?.[0];
  const high = range?.[1];

  return (
    <div className={`board-row ${red ? 'row-red' : 'row-black'}`}>
      <div className="board-suit-badge" aria-hidden="true">{symbol}</div>
      <div className="board-track">
        {slots.map((v) => {
          const isPlayed = range && v >= low && v <= high;
          const isSeven = v === 7;
          const isLowEnd = isPlayed && v === low && low !== high;
          const isHighEnd = isPlayed && v === high && low !== high;

          return (
            <div
              key={v}
              className={[
                'board-card-slot',
                isPlayed ? 'is-played' : 'is-empty',
                isSeven ? 'is-seven' : '',
                isLowEnd ? 'is-end is-low-end' : '',
                isHighEnd ? 'is-end is-high-end' : '',
              ].filter(Boolean).join(' ')}
            >
              {isPlayed ? (
                <>
                  <span className="board-card-value">{cardLabel(v)}</span>
                  <span className="board-card-suit">{symbol}</span>
                </>
              ) : isSeven ? (
                <span className="board-seven-mark">7</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GameBoard({ board, theme = 'board-default' }) {
  const zoneRef = useRef(null);
  const boardRef = useRef(null);

  useLayoutEffect(() => {
    const zone = zoneRef.current;
    const el = boardRef.current;
    if (!zone || !el) return;

    const fit = () => {
      el.style.transform = '';
      const pad = 6;
      const zw = zone.clientWidth - pad;
      const zh = zone.clientHeight - pad;
      const bw = el.offsetWidth;
      const bh = el.offsetHeight;
      if (!bw || !bh || !zw || !zh) return;

      const scale = Math.min(zw / bw, zh / bh, 2.5);
      if (Math.abs(scale - 1) > 0.02) {
        el.style.transform = `scale(${Math.max(0.55, scale)})`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(zone);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [board]);

  if (!board) return null;

  return (
    <div ref={zoneRef} className="game-board-zone">
      <div ref={boardRef} className={`game-board ${theme}`}>
        <div className="board-felt-texture" aria-hidden="true" />
        <div className="board-title">Table</div>
        <div className="board-rows">
          {SUITS.map(suit => (
            <BoardRow key={suit} suit={suit} range={board[suit]} />
          ))}
        </div>
      </div>
    </div>
  );
}
