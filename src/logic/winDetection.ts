import type { Board, Player } from '../types';
import { ROWS, COLS } from '../constants';

type Coord = [number, number];

function generateLines(): Coord[][] {
  const lines: Coord[][] = [];
  for (let r = 0; r < ROWS; r++)
    lines.push(Array.from({ length: COLS }, (_, c) => [r, c] as Coord));
  for (let c = 0; c < COLS; c++)
    lines.push(Array.from({ length: ROWS }, (_, r) => [r, c] as Coord));
  if (ROWS === COLS) {
    lines.push(Array.from({ length: ROWS }, (_, i) => [i, i] as Coord));
    lines.push(Array.from({ length: ROWS }, (_, i) => [i, COLS - 1 - i] as Coord));
  }
  return lines;
}

export const LINES: Coord[][] = generateLines();

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
