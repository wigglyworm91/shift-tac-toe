import type { GameConfig } from './types';

export const ROWS = 3;
export const COLS = 3;
export const MAX_OFFSET = 1;
export const WIN_LENGTH = ROWS;
export const DISCS_PER_PLAYER = Math.ceil(ROWS * COLS / 2);

export const DEFAULT_CONFIG: GameConfig = {
  rows: ROWS,
  cols: COLS,
  winLength: WIN_LENGTH,
  maxOffset: MAX_OFFSET,
};

export const CELL_SIZE = 80;
export const CELL_GAP = 4;
export const CELL_WITH_GAP = CELL_SIZE + CELL_GAP; // 84px — one slot step
