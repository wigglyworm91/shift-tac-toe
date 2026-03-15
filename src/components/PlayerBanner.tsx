import type { Player } from '../types';

interface PlayerBannerProps {
  currentPlayer: Player;
  phase: 'playing' | 'won' | 'draw';
  winners: Player[];
  isAiTurn?: boolean;
  mode?: '0p' | '1p' | '2p' | 'online';
  isOnlineOpponentTurn?: boolean;
}

export function PlayerBanner({ currentPlayer, phase, winners, isAiTurn, mode, isOnlineOpponentTurn }: PlayerBannerProps) {
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

  let label: string;
  if (mode === '0p') {
    label = `${currentPlayer === 'red' ? 'Red' : 'Black'} is thinking…`;
  } else if (isAiTurn) {
    label = 'Black is thinking…';
  } else if (mode === '1p') {
    label = 'Your turn';
  } else if (mode === 'online') {
    label = isOnlineOpponentTurn ? 'Their turn' : 'Your turn';
  } else {
    label = `${currentPlayer === 'red' ? 'Red' : 'Black'}'s turn`;
  }

  return (
    <div className={`player-banner playing ${currentPlayer}`}>
      {label}
    </div>
  );
}
