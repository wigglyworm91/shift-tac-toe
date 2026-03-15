import { DISCS_PER_PLAYER } from '../constants';
import type { Player } from '../types';

interface DiscCounterProps {
  player: Player;
  count: number;
  isCurrentPlayer: boolean;
}

export function DiscCounter({ player, count, isCurrentPlayer }: DiscCounterProps) {
  return (
    <div className={`disc-counter ${player} ${isCurrentPlayer ? 'active' : ''}`}>
      <span className="player-label">{player === 'red' ? 'Red' : 'Black'}</span>
      <div className="disc-pips">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`disc-pip ${player}`} />
        ))}
        {Array.from({ length: DISCS_PER_PLAYER - count }, (_, i) => (
          <div key={`empty-${i}`} className="disc-pip empty" />
        ))}
      </div>
    </div>
  );
}
