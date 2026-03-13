import type { Player } from '../types';

interface WinOverlayProps {
  phase: 'won' | 'draw';
  winners: Player[];
  onReset: () => void;
}

export function WinOverlay({ phase, winners, onReset }: WinOverlayProps) {
  let message: string;
  if (phase === 'draw') {
    message = "It's a draw!";
  } else if (winners.length === 2) {
    message = 'Both players win!';
  } else {
    message = `${winners[0] === 'red' ? 'Red' : 'Black'} wins!`;
  }

  return (
    <div className="win-overlay">
      <div className="win-dialog">
        <div className="win-message">{message}</div>
        <button className="new-game-btn" onClick={onReset}>
          Play Again
        </button>
      </div>
    </div>
  );
}
