const SUIT_CAP = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};

const SUIT_LETTER = {
  spades: 's',
  hearts: 'h',
  diamonds: 'd',
  clubs: 'c',
};

/** Kenney spritesheets: row 0 hearts → row 3 diamonds, cols 0 ace → 12 king */
const SPRITE_SUIT_ROW = {
  hearts: 0,
  spades: 1,
  clubs: 2,
  diamonds: 3,
};

const SPRITE_COLS = 13;
const SPRITE_ROWS = 4;
const SPRITE_CELL_W = 32;
const SPRITE_CELL_H = 48;

const KERENEL_SUIT_BASE = {
  hearts: 1,
  spades: 15,
  diamonds: 29,
  clubs: 43,
};

const CARD_ART_THEMES = {
  'cards-pixel': {
    type: 'file',
    pixelArt: true,
    preview: '/themes/cards-png/Spades/Spades_card_07.png',
    back: '/themes/cards-png/Backs/back_0.png',
    getFace: (suit, value) => {
      const folder = SUIT_CAP[suit];
      const num = String(value).padStart(2, '0');
      return `/themes/cards-png/${folder}/${folder}_card_${num}.png`;
    },
  },
  'cards-handdrawn': {
    type: 'file',
    preview: '/themes/Hand Drawn Cards/Spades/7s.png',
    back: '/themes/Hand Drawn Cards/Back Blue.png',
    getFace: (suit, value) =>
      `/themes/Hand Drawn Cards/${SUIT_CAP[suit]}/${value}${SUIT_LETTER[suit]}.png`,
  },
  'cards-pixel-fantasy': {
    type: 'file',
    pixelArt: true,
    preview: '/themes/Pixel Fantasy Playing Cards/Playing Cards/card-spades-7.png',
    back: '/themes/Pixel Fantasy Playing Cards/Playing Cards/card-back1.png',
    getFace: (suit, value) =>
      `/themes/Pixel Fantasy Playing Cards/Playing Cards/card-${suit}-${value}.png`,
  },
  'cards-kernel': {
    type: 'file',
    pixelArt: true,
    preview: '/themes/kerenel_Cards_seperated/21_kerenel_Cards.png',
    back: '/themes/kerenel_Cards_seperated/28_kerenel_Cards.png',
    getFace: (suit, value) => {
      const idx = KERENEL_SUIT_BASE[suit] + (value - 1);
      return `/themes/kerenel_Cards_seperated/${String(idx).padStart(2, '0')}_kerenel_Cards.png`;
    },
  },
  'cards-classic': {
    type: 'sprite',
    pixelArt: true,
    sheet: '/themes/ClassicCards/ClassicCards.png',
    back: '/themes/ClassicCards/Backsides/LightClassic.png',
  },
  'cards-fantasy-icons': {
    type: 'sprite',
    pixelArt: true,
    sheet: '/themes/FantasyCards/FantasyCards.png',
    back: '/themes/FantasyCards/Backsides/DefaultFantasy.png',
  },
  'cards-fire-icons': {
    type: 'sprite',
    pixelArt: true,
    sheet: '/themes/FireCards/FireCards.png',
    back: '/themes/FireCards/Backside/DefaultFire.png',
  },
};

function getSpriteImgArt(suit, value, sheet, scale) {
  const col = value - 1;
  const row = SPRITE_SUIT_ROW[suit];
  const cellW = SPRITE_CELL_W * scale;
  const cellH = SPRITE_CELL_H * scale;

  return {
    type: 'sprite',
    src: sheet,
    pixelArt: true,
    cellW,
    cellH,
    imgStyle: {
      position: 'absolute',
      left: `${-col * cellW}px`,
      top: `${-row * cellH}px`,
      width: `${SPRITE_COLS * cellW}px`,
      height: `${SPRITE_ROWS * cellH}px`,
    },
  };
}

export function isArtCardTheme(themeId) {
  return themeId in CARD_ART_THEMES;
}

/** @deprecated use isArtCardTheme */
export function isImageCardTheme(themeId) {
  return isArtCardTheme(themeId);
}

export function isPixelArtCardTheme(themeId) {
  return !!CARD_ART_THEMES[themeId]?.pixelArt;
}

export function getCardBackSrc(themeId) {
  return CARD_ART_THEMES[themeId]?.back ?? null;
}

/** @deprecated */
export function getCardImageSrc(themeId, suit, value) {
  const art = getCardFaceArt(themeId, suit, value);
  return art?.type === 'file' ? art.src : null;
}

export function getCardFaceArt(themeId, suit, value) {
  const theme = CARD_ART_THEMES[themeId];
  if (!theme) return null;

  if (theme.type === 'file') {
    return { type: 'file', src: theme.getFace(suit, value), pixelArt: theme.pixelArt };
  }

  if (theme.type === 'sprite') {
    return getSpriteImgArt(suit, value, theme.sheet, 2);
  }

  return null;
}

export function getCardThemePreview(themeId) {
  const theme = CARD_ART_THEMES[themeId];
  if (!theme) return null;

  if (theme.type === 'file') {
    return {
      type: 'file',
      src: theme.preview ?? theme.getFace('spades', 7),
      pixelArt: theme.pixelArt,
    };
  }

  if (theme.type === 'sprite') {
    return getSpriteImgArt('spades', 7, theme.sheet, 2);
  }

  return null;
}
