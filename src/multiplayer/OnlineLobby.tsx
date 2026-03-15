import { useState, useEffect } from 'react';
import type { MpState } from './useMultiplayer';

interface Props {
  mpState: MpState;
  shareUrl: string | null;
  onDisconnect: () => void;
}

export function OnlineLobby({ mpState, shareUrl, onDisconnect }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const reason = (e as CustomEvent<string>).detail;
      if (reason === 'ROOM_NOT_FOUND') setError('Room not found — the link may have expired.');
      else setError('Could not join room.');
    };
    window.addEventListener('mp-error', handler);
    return () => window.removeEventListener('mp-error', handler);
  }, []);

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (mpState === 'connecting') {
    return (
      <div className="online-lobby">
        <p className="lobby-status">Connecting…</p>
      </div>
    );
  }

  if (mpState === 'waiting') {
    return (
      <div className="online-lobby">
        <p className="lobby-status">Waiting for opponent…</p>
        {shareUrl && (
          <div className="share-row">
            <input className="share-url" readOnly value={shareUrl} onFocus={e => e.target.select()} />
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        )}
        <button className="lobby-btn secondary" onClick={onDisconnect}>Cancel</button>
      </div>
    );
  }

  if (mpState === 'opponent_left') {
    return (
      <div className="online-lobby">
        <p className="lobby-status">Opponent disconnected.</p>
        <button className="lobby-btn" onClick={onDisconnect}>Back to menu</button>
      </div>
    );
  }

  // idle — only reachable on error
  return (
    <div className="online-lobby">
      {error && <p className="lobby-error">{error}</p>}
      <button className="lobby-btn secondary" onClick={onDisconnect}>Back to menu</button>
    </div>
  );
}
