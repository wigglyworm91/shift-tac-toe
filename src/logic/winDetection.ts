import type { Board, Player, GameConfig } from '../types';
import { ROWS, COLS, WIN_LENGTH } from '../constants';

type Coord = [number, number];

export function generateLines(rows: number, cols: number, winLength: number): Coord[][] {
  const lines: Coord[][] = [];

  // Rows: all winLength-length sub-runs
  for (let r = 0; r < rows; r++)
    for (let c = 0; c <= cols - winLength; c++)
      lines.push(Array.from({ length: winLength }, (_, i) => [r, c + i] as Coord));

  // Columns: all winLength-length sub-runs
  for (let c = 0; c < cols; c++)
    for (let r = 0; r <= rows - winLength; r++)
      lines.push(Array.from({ length: winLength }, (_, i) => [r + i, c] as Coord));

  // Diagonals (top-left to bottom-right)
  for (let r = 0; r <= rows - winLength; r++)
    for (let c = 0; c <= cols - winLength; c++)
      lines.push(Array.from({ length: winLength }, (_, i) => [r + i, c + i] as Coord));

  // Diagonals (top-right to bottom-left)
  for (let r = 0; r <= rows - winLength; r++)
    for (let c = winLength - 1; c < cols; c++)
      lines.push(Array.from({ length: winLength }, (_, i) => [r + i, c - i] as Coord));

  return lines;
}

// Static export for backward compat (used by tests / external consumers)
export const LINES: Coord[][] = generateLines(ROWS, COLS, WIN_LENGTH);

export interface WinResult {
  winners: Player[];
  winningCells: Coord[];
}

export function checkWin(board: Board, config: GameConfig): WinResult {
  const lines = generateLines(config.rows, config.cols, config.winLength);
  const winners = new Set<Player>();
  const winningCellSet = new Set<string>();

  for (const line of lines) {
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
