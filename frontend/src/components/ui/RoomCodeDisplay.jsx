import { useState } from 'react';
import { copyToClipboard } from '../../utils/clipboard';

export default function RoomCodeDisplay({ roomId, compact }) {
  const [copied, setCopied] = useState(false);

  async function copyCode(e) {
    e?.stopPropagation?.();
    const ok = await copyToClipboard(roomId);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!roomId) return null;

  return (
    <div
      className={`room-code-display ${compact ? 'room-code-compact' : ''}`}
      onClick={copyCode}
      title="Click to copy room code"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && copyCode(e)}
    >
      <span className="room-code-label">Room</span>
      <span className="room-code-value">{roomId}</span>
      <button type="button" className="copy-btn copy-btn-sm" onClick={copyCode}>
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
}
