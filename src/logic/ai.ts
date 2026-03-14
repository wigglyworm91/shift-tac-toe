import type { GameState, Action, Player } from '../types';
import { ROWS, COLS } from '../constants';
import { gameReducer } from './gameReducer';
import { canDrop, canShift } from './validation';
import { LINES } from './winDetection';

function getMoves(state: GameState): Action[] {
  const moves: Action[] = [];
  for (let c = 0; c < COLS; c++) {
    if (canDrop(state, c)) moves.push({ type: 'DROP_DISC', col: c });
  }
  for (let r = 0; r < ROWS; r++) {
    if (canShift(state, r, 'left'))  moves.push({ type: 'SHIFT_ROW', row: r, direction: 'left' });
    if (canShift(state, r, 'right')) moves.push({ type: 'SHIFT_ROW', row: r, direction: 'right' });
  }
  return moves;
}

function evaluate(state: GameState, aiPlayer: Player): number {
  const opp: Player = aiPlayer === 'red' ? 'black' : 'red';
  let score = 0;
  for (const line of LINES) {
    let aiCount = 0;
    let oppCount = 0;
    for (const [r, c] of line) {
      const cell = state.board[r][c];
      if (cell === aiPlayer) aiCount++;
      else if (cell === opp) oppCount++;
    }
    // Mixed lines are worthless — skip
    if (aiCount > 0 && oppCount > 0) continue;
    if (aiCount === 2) score += 100;
    else if (aiCount === 1) score += 10;
    if (oppCount === 2) score -= 100;
    else if (oppCount === 1) score -= 10;
  }
  return score;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Player,
): number {
  if (state.phase === 'won') {
    // If aiPlayer is in winners it's a win; if opponent is, it's a loss; if both, draw.
    const aiWon  = state.winners.includes(aiPlayer);
    const oppWon = state.winners.length > 0 && !aiWon;
    if (aiWon && oppWon) return 0;
    return aiWon ? 10000 + depth : -(10000 + depth);
    // Depth bonus makes the AI prefer faster wins and slower losses.
  }
  if (state.phase === 'draw') return 0;
  if (depth === 0) return evaluate(state, aiPlayer);

  const moves = getMoves(state);
  if (moves.length === 0) return evaluate(state, aiPlayer);

  if (maximizing) {
    let best = -Infinity;
    for (const action of moves) {
      const next = gameReducer(state, action);
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false, aiPlayer));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const action of moves) {
      const next = gameReducer(state, action);
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, true, aiPlayer));
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

/** Returns the best action for the current player in `state`. */
export function getBestMove(state: GameState, depth = 7): Action | null {
  const aiPlayer = state.currentPlayer;
  const moves = getMoves(state);
  if (moves.length === 0) return null;

  // Shuffle to break ties non-deterministically
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }

  let bestScore = -Infinity;
  let bestMove = moves[0];
  for (const action of moves) {
    const next = gameReducer(state, action);
    const score = minimax(next, depth - 1, -Infinity, Infinity, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = action;
    }
  }
  return bestMove;
}
