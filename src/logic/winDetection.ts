import type { Board, Player } from '../types';

type Coord = [number, number];

export const LINES: Coord[][] = [
  // Rows
  [[0,0],[0,1],[0,2]],
  [[1,0],[1,1],[1,2]],
  [[2,0],[2,1],[2,2]],
  // Columns
  [[0,0],[1,0],[2,0]],
  [[0,1],[1,1],[2,1]],
  [[0,2],[1,2],[2,2]],
  // Diagonals
  [[0,0],[1,1],[2,2]],
  [[0,2],[1,1],[2,0]],
];

export interface WinResult {
  winners: Player[];
  winningCells: Coord[];
}

export function checkWin(board: Board): WinResult {
  const winners = new Set<Player>();
  const winningCellSet = new Set<string>();

  for (const line of LINES) {
    const values = line.map(([r, c]) => board[r][c]);
    if (values[0] !== null && values.every(v => v === values[0])) {
      winners.add(values[0] as Player);
      for (const coord of line) {
        winningCellSet.add(JSON.stringify(coord));
      }
    }
  }

  return {
    winners: [...winners],
    winningCells: [...winningCellSet].map(s => JSON.parse(s) as Coord),
  };
}
