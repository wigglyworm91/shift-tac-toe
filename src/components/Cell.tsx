import type { Player } from '../types';

interface CellProps {
  player: Player | null;
  isWinning: boolean;
  animate?: boolean;
}

export function Cell({ player, isWinning, animate }: CellProps) {
  return (
    <div
      className={[
        'cell',
        player ?? 'empty',
        isWinning ? 'winning' : '',
        animate ? 'drop-in' : '',
      ].filter(Boolean).join(' ')}
    />
  );
}
