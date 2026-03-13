import type { Player } from '../types';

interface CellProps {
  player: Player | null;
  isWinning: boolean;
}

export function Cell({ player, isWinning }: CellProps) {
  return (
    <div className={`cell ${player ?? 'empty'} ${isWinning ? 'winning' : ''}`} />
  );
}
