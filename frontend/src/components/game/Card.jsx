import { cardLabel, SUIT_SYMBOLS } from '../../utils/cards';
import {
  getCardBackSrc,
  getCardFaceArt,
  isArtCardTheme,
  isPixelArtCardTheme,
} from '../../utils/cardThemes';

export default function Card({
  card,
  themeId = 'cards-default',
  selectable,
  selected,
  onClick,
  onDoubleClick,
  small,
  faceDown,
}) {
  const clickProps = selectable
    ? { onClick, onDoubleClick, role: 'button' }
    : {};
  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';
  const artTheme = isArtCardTheme(themeId);
  const pixelArt = isPixelArtCardTheme(themeId);

  if (faceDown) {
    const backSrc = getCardBackSrc(themeId);
    if (backSrc) {
      return (
        <div className={`card card-image card-back-img ${pixelArt ? 'card-pixel-art' : ''} ${small ? 'card-sm' : ''}`}>
          <img src={backSrc} alt="" draggable={false} />
        </div>
      );
    }

    return (
      <div className={`card card-back ${small ? 'card-sm' : ''}`}>
        <div className="card-back-pattern">♠</div>
      </div>
    );
  }

  const art = getCardFaceArt(themeId, card.suit, card.value);
  if (artTheme && art) {
    const classes = [
      'card',
      art.type === 'sprite' ? 'card-sprite' : 'card-image',
      art.pixelArt ? 'card-pixel-art' : '',
      selectable ? 'card-selectable' : '',
      selected ? 'card-selected' : '',
      small ? 'card-sm' : '',
    ].filter(Boolean).join(' ');

    if (art.type === 'sprite') {
      return (
        <div
          className={classes}
          {...clickProps}
          title={selectable ? `Play ${cardLabel(card.value)}${SUIT_SYMBOLS[card.suit]}` : undefined}
        >
          <img src={art.src} style={art.imgStyle} alt="" draggable={false} />
        </div>
      );
    }

    return (
      <div
        className={classes}
        {...clickProps}
        title={selectable ? `Play ${cardLabel(card.value)}${SUIT_SYMBOLS[card.suit]}` : undefined}
      >
        <img
          src={art.src}
          alt={`${cardLabel(card.value)} of ${card.suit}`}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      className={[
        'card',
        isRed ? 'card-red' : 'card-black',
        selectable ? 'card-selectable' : '',
        selected ? 'card-selected' : '',
        small ? 'card-sm' : '',
      ].filter(Boolean).join(' ')}
      {...clickProps}
      title={selectable ? `Play ${cardLabel(card.value)}${SUIT_SYMBOLS[card.suit]}` : undefined}
    >
      <div className="card-corner card-tl">
        <div className="card-val">{cardLabel(card.value)}</div>
        <div className="card-suit">{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className="card-center-suit">{SUIT_SYMBOLS[card.suit]}</div>
      <div className="card-corner card-br">
        <div className="card-val">{cardLabel(card.value)}</div>
        <div className="card-suit">{SUIT_SYMBOLS[card.suit]}</div>
      </div>
    </div>
  );
}
