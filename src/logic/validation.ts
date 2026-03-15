import type { GameState } from '../types';

export function canDrop(state: GameState, col: number): boolean {
  if (state.phase !== 'playing') return false;
  if (state.discs[state.currentPlayer] <= 0) return false;
  return state.board[0][col] === null;
}

export function canShift(
  state: GameState,
  row: number,
  direction: 'left' | 'right'
): boolean {
  if (state.phase !== 'playing') return false;
  const offset = state.rowOffsets[row];
  const { maxOffset } = state.config;
  if (direction === 'left' && offset <= -maxOffset) return false;
  if (direction === 'right' && offset >= maxOffset) return false;
  return true;
}
