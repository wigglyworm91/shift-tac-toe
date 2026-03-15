import type { GameState, Action, Player, GameConfig } from '../types';
import { gameReducer, hashPosition } from './gameReducer';
import { canDrop, canShift } from './validation';
import { generateLines } from './winDetection';

type Coord = [number, number];

function getMoves(state: GameState): Action[] {
  const moves: Action[] = [];
  const { rows, cols } = state.config;
  for (let c = 0; c < cols; c++) {
    if (canDrop(state, c)) moves.push({ type: 'DROP_DISC', col: c });
  }
  for (let r = 0; r < rows; r++) {
    if (canShift(state, r, 'left'))  moves.push({ type: 'SHIFT_ROW', row: r, direction: 'left' });
    if (canShift(state, r, 'right')) moves.push({ type: 'SHIFT_ROW', row: r, direction: 'right' });
  }
  return moves;
}

function evaluate(state: GameState, aiPlayer: Player, lines: Coord[][]): number {
  const opp: Player = aiPlayer === 'red' ? 'black' : 'red';
  let score = 0;
  for (const line of lines) {
    let aiCount = 0;
    let oppCount = 0;
    for (const [r, c] of line) {
      const cell = state.board[r][c];
      if (cell === aiPlayer) aiCount++;
      else if (cell === opp) oppCount++;
    }
    // Mixed lines are worthless — skip
    if (aiCount > 0 && oppCount > 0) continue;
    // Score scales exponentially with count so near-complete lines dominate.
    // 10^(n-1): 1 disc → 1pt, 2 → 10pt, 3 → 100pt, etc.
    if (aiCount > 0)  score += Math.pow(10, aiCount - 1);
    if (oppCount > 0) score -= Math.pow(10, oppCount - 1);
  }

  // Slight penalty for positions approaching draw by repetition.
  // Discourages cycling when ahead, but a draw (0) still beats a loss (-10000).
  const hash = hashPosition(state.board, state.rowOffsets, state.currentPlayer, state.config.maxOffset);
  if ((state.positionCounts[hash] ?? 0) >= 2) score -= 50;

  return score;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Player,
  lines: Coord[][],
): number {
  if (state.phase === 'won') {
    const aiWon  = state.winners.includes(aiPlayer);
    const oppWon = state.winners.length > 0 && !aiWon;
    if (aiWon && oppWon) return 0;
    return aiWon ? 10000 + depth : -(10000 + depth);
  }
  if (state.phase === 'draw') return 0;
  if (depth === 0) return evaluate(state, aiPlayer, lines);

  const moves = getMoves(state);
  if (moves.length === 0) return evaluate(state, aiPlayer, lines);

  if (maximizing) {
    let best = -Infinity;
    for (const action of moves) {
      const next = gameReducer(state, action);
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false, aiPlayer, lines));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const action of moves) {
      const next = gameReducer(state, action);
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, true, aiPlayer, lines));
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

export type Difficulty = 'easy' | 'hard' | 'impossible';

const DIFFICULTY_CONFIG: Record<Difficulty, { maxDepth: number; randomChance: number }> = {
  easy:       { maxDepth: 1, randomChance: 0.45 },
  hard:       { maxDepth: 4, randomChance: 0.15 },
  impossible: { maxDepth: 7, randomChance: 0 },
};

/**
 * Scale search depth so compute time stays roughly constant across board sizes.
 * Targets the same number of nodes as a 3×3 board at depth 7 (≈9^7 ≈ 5M).
 * depth = 7 × log(9) / log(branchFactor), capped at maxDepth and floored at 3.
 */
function adaptiveDepth(config: GameConfig, maxDepth: number): number {
  const branch = config.cols + 2 * config.rows; // rough worst-case moves/turn
  const scaled = Math.round(7 * Math.log(9) / Math.log(Math.max(branch, 9)));
  return Math.max(3, Math.min(maxDepth, scaled));
}

/** Returns the best action for the current player in `state`. */
export function getBestMove(state: GameState, difficulty: Difficulty = 'impossible'): Action | null {
  const { maxDepth, randomChance } = DIFFICULTY_CONFIG[difficulty];
  const aiPlayer = state.currentPlayer;
  const moves = getMoves(state);
  if (moves.length === 0) return null;

  // Lower difficulties randomly skip minimax and pick any legal move.
  if (randomChance > 0 && Math.random() < randomChance) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = adaptiveDepth(state.config, maxDepth);

  // Generate lines once for this search
  const lines = generateLines(state.config.rows, state.config.cols, state.config.winLength);

  // Shuffle to break ties non-deterministically
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }

  let bestScore = -Infinity;
  let bestMove = moves[0];
  for (const action of moves) {
    const next = gameReducer(state, action);
    const score = minimax(next, depth - 1, -Infinity, Infinity, false, aiPlayer, lines);
    if (score > bestScore) {
      bestScore = score;
      bestMove = action;
    }
  }
  return bestMove;
}
