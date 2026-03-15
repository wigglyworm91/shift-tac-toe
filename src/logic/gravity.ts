import type { Board, Cell } from '../types';

function applyGravityToColumn(col: Cell[]): Cell[] {
  const discs = col.filter((c): c is NonNullable<Cell> => c !== null);
  const empties: null[] = Array(col.length - discs.length).fill(null);
  return [...empties, ...discs];
}

export function applyGravityAll(board: Board): Board {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const columns: Cell[][] = Array.from({ length: cols }, (_, c) =>
    board.map(row => row[c])
  );
  const settled = columns.map(applyGravityToColumn);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => settled[c][r])
  );
}

/** Like applyGravityAll but also reports which cells received a disc due to falling. */
export function applyGravityAllTracked(board: Board): { board: Board; drops: [number, number][] } {
  const newBoard = applyGravityAll(board);
  const drops: [number, number][] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < (board[0]?.length ?? 0); c++) {
      if (board[r][c] === null && newBoard[r][c] !== null) {
        drops.push([r, c]);
      }
    }
  }
  return { board: newBoard, drops };
}
