import { useState, useEffect } from 'react';
import { socket, refreshWallet } from '../../socket';
import { useGameStore } from '../../store/gameStore';
import { getCardThemePreview } from '../../utils/cardThemes';

export default function ShopPanel({ onClose }) {
  const { playerId, wallet, setWallet, connected } = useGameStore();
  const [tab, setTab] = useState('boards');
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    if (wallet) return;
    if (!socket.connected) socket.connect();
    const load = () => refreshWallet(playerId, setWallet);
    if (socket.connected) load();
    else socket.once('connect', load);
  }, [wallet, playerId, setWallet]);

  const items = wallet?.catalog?.[tab] ?? [];

  function handleBuy(itemId) {
    setLoading(`buy-${itemId}`);
    socket.emit('shop:buy', { playerId, type: tab, itemId }, (res) => {
      setLoading(null);
      if (res.error) return alert(res.error);
      setWallet(res.wallet);
    });
  }

  function handleEquip(itemId) {
    setLoading(`eq-${itemId}`);
    socket.emit('shop:equip', { playerId, type: tab, itemId }, (res) => {
      setLoading(null);
      if (res.error) return alert(res.error);
      setWallet(res.wallet);
    });
  }

  function isOwned(id) {
    const list = tab === 'boards' ? wallet.ownedBoards : wallet.ownedCards;
    return list?.includes(id);
  }

  function isEquipped(id) {
    return tab === 'boards' ? wallet.equippedBoard === id : wallet.equippedCards === id;
  }

  return (
    <div className="shop-overlay" onClick={onClose}>
      <div className="shop-panel" onClick={e => e.stopPropagation()}>
        <div className="shop-header">
          <h2>Shop</h2>
          <div className="shop-coins">🪙 {wallet?.coins ?? '—'} coins</div>
          <button type="button" className="shop-close" onClick={onClose}>✕</button>
        </div>

        <div className="shop-tabs">
          <button className={tab === 'boards' ? 'active' : ''} onClick={() => setTab('boards')}>Boards</button>
          <button className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}>Cards</button>
        </div>

        <div className="shop-grid">
          {!wallet && (
            <p className="shop-loading">
              {connected ? 'Loading shop...' : 'Connecting to server...'}
            </p>
          )}
          {wallet && items.map(item => {
            const owned = isOwned(item.id);
            const equipped = isEquipped(item.id);
            const busy = loading === `buy-${item.id}` || loading === `eq-${item.id}`;
            const preview = tab === 'cards' ? getCardThemePreview(item.id) : null;

            return (
              <div key={item.id} className={`shop-item shop-tier-${item.tier} ${equipped ? 'equipped' : ''}`}>
                {preview?.type === 'sprite' ? (
                  <div className="shop-preview shop-preview-art">
                    <div
                      className="shop-sprite-clip"
                      style={{ width: preview.cellW, height: preview.cellH }}
                    >
                      <img src={preview.src} style={preview.imgStyle} alt="" draggable={false} />
                    </div>
                  </div>
                ) : preview?.type === 'file' ? (
                  <div className={`shop-preview shop-preview-art ${preview.pixelArt ? 'shop-preview-pixel' : 'shop-preview-file'}`}>
                    <img src={preview.src} alt="" draggable={false} />
                  </div>
                ) : (
                  <div className={`shop-preview ${item.id}`} />
                )}
                <div className="shop-item-name">{item.name}</div>
                <div className="shop-item-price">
                  {item.price === 0 ? 'Free' : `🪙 ${item.price}`}
                </div>
                {item.kind === 'image' && <div className="shop-item-tag">Artwork deck</div>}
                <div className="shop-item-actions">
                  {!owned && item.price > 0 && (
                    <button
                      className="btn-shop-buy"
                      disabled={busy || wallet.coins < item.price}
                      onClick={() => handleBuy(item.id)}
                    >
                      Buy
                    </button>
                  )}
                  {owned && !equipped && (
                    <button className="btn-shop-equip" disabled={busy} onClick={() => handleEquip(item.id)}>
                      Equip
                    </button>
                  )}
                  {equipped && <span className="equipped-tag">Equipped</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
