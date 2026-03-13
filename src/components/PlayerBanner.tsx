import type { Player } from '../types';

interface PlayerBannerProps {
  currentPlayer: Player;
  phase: 'playing' | 'won' | 'draw';
  winners: Player[];
}

export function PlayerBanner({ currentPlayer, phase, winners }: PlayerBannerProps) {
  if (phase === 'draw') {
    return <div className="player-banner draw">It's a draw!</div>;
  }
  if (phase === 'won') {
    const msg =
      winners.length === 2
        ? 'Both players win!'
        : `${winners[0] === 'red' ? 'Red' : 'Black'} wins!`;
    return <div className={`player-banner won ${winners[0]}`}>{msg}</div>;
  }
  return (
    <div className={`player-banner playing ${currentPlayer}`}>
      {currentPlayer === 'red' ? 'Red' : 'Black'}'s turn
    </div>
  );
}
