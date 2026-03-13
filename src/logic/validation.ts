import type { GameState } from '../types';
import { MAX_OFFSET } from '../constants';

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
  if (direction === 'left' && offset <= -MAX_OFFSET) return false;
  if (direction === 'right' && offset >= MAX_OFFSET) return false;
  return true;
}
