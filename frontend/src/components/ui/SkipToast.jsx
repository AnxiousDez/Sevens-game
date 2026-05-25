import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export default function SkipToast() {
  const { skipEvent, setSkipEvent } = useGameStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!skipEvent) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setSkipEvent(null);
    }, 3500);
    return () => clearTimeout(t);
  }, [skipEvent, setSkipEvent]);

  if (!visible || !skipEvent) return null;

  return (
    <div className="skip-toast">
      <span className="skip-icon">⏭️</span>
      <div>
        <strong>Turn skipped</strong>
        <p>You were skipped because you have no valid moves.</p>
      </div>
    </div>
  );
}
