import { useEffect, useState } from 'react';

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900);
}

export function tryLockLandscape() {
  if (!isMobileDevice()) return;
  try {
    screen.orientation?.lock?.('landscape').catch(() => {});
  } catch {
    /* unsupported */
  }
}

export default function LandscapeGate({ active, children }) {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    if (!active || !isMobileDevice()) {
      setPortrait(false);
      return;
    }
    const mq = window.matchMedia('(orientation: portrait) and (max-width: 900px)');
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [active]);

  useEffect(() => {
    if (active && !portrait) tryLockLandscape();
  }, [active, portrait]);

  return (
    <>
      {children}
      {active && portrait && (
        <div className="landscape-overlay" role="dialog" aria-label="Rotate device">
          <div className="landscape-overlay-card">
            <div className="landscape-icon" aria-hidden>📱↻</div>
            <h2>Rotate your phone</h2>
            <p>Sevens works best in <strong>landscape</strong>. Turn your device sideways to continue.</p>
          </div>
        </div>
      )}
    </>
  );
}
