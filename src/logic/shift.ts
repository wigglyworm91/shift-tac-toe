import type { Board, Cell, Player } from '../types';
import { applyGravityAll } from './gravity';

export interface ShiftResult {
  board: Board;
  reclaimed: Partial<Record<Player, number>>;
}

export function shiftRow(
  board: Board,
  rowIndex: number,
  direction: 'left' | 'right'
): ShiftResult {
  const row = [...board[rowIndex]];
  const reclaimed: Partial<Record<Player, number>> = {};

  let ejected: Cell;
  if (direction === 'left') {
    ejected = row[0];
    row.shift();
    row.push(null);
  } else {
    ejected = row[row.length - 1];
    row.pop();
    row.unshift(null);
  }

  if (ejected !== null) {
    reclaimed[ejected] = (reclaimed[ejected] ?? 0) + 1;
  }

  const newBoard: Board = board.map((r, i) => (i === rowIndex ? row : [...r]));
  return { board: applyGravityAll(newBoard), reclaimed };
}
