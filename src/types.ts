export type Player = 'red' | 'black';
export type Cell = Player | null;
export type Board = Cell[][];
export type RowOffsets = [number, number, number];

export interface GameState {
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
  | { type: 'RESET_GAME' };
