import type { Board, Cell } from '../types';
import { ROWS, COLS } from '../constants';

function applyGravityToColumn(col: Cell[]): Cell[] {
  const discs = col.filter((c): c is NonNullable<Cell> => c !== null);
  const empties: null[] = Array(col.length - discs.length).fill(null);
  return [...empties, ...discs];
}

export function applyGravityAll(board: Board): Board {
  // Extract columns, apply gravity, rebuild row-major board
  const columns: Cell[][] = Array.from({ length: COLS }, (_, c) =>
    board.map(row => row[c])
  );
  const settled = columns.map(applyGravityToColumn);
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => settled[c][r])
  );
}
