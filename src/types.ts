export type Player = 'red' | 'black';
export type Cell = Player | null;
export type Board = Cell[][];
export type RowOffsets = number[];

export interface GameConfig {
  rows: number;
  cols: number;
  winLength: number;
  maxOffset: number;
}

export interface GameState {
  config: GameConfig;
  board: Board;
  rowOffsets: RowOffsets;
  currentPlayer: Player;
  discs: Record<Player, number>;
  phase: 'playing' | 'won' | 'draw';
  winners: Player[];
  winningCells: [number, number][];
  lastGravityDrops: [number, number][];
}

export type Action =
  | { type: 'DROP_DISC'; col: number }
  | { type: 'SHIFT_ROW'; row: number; direction: 'left' | 'right' }
  | { type: 'RESET_GAME'; firstPlayer?: Player; config?: GameConfig };
