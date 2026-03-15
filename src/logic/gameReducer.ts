import type { GameState, Action, Player, Board, GameConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { applyGravityAll } from './gravity';
import { shiftRow } from './shift';
import { checkWin } from './winDetection';
import { canDrop, canShift } from './validation';

function emptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

/** Canonical string key for a position — board + row offsets + whose turn it is.
 *  Row offsets are normalised to limit-status (-1 = at left limit, 0 = free, +1 = at right limit)
 *  so positions that differ only in the specific numeric offset but have the same shift
 *  availability are treated as identical. This is especially important for unlimited shifting,
 *  where the raw numeric offset is meaningless.
 */
export function hashPosition(board: Board, rowOffsets: number[], currentPlayer: Player, maxOffset: number): string {
  const normOffsets = rowOffsets.map(o =>
    o <= -maxOffset ? -1 : o >= maxOffset ? 1 : 0
  );
  return board.map(row => row.map(c => c ? c[0] : '.').join('')).join('|')
    + '/' + normOffsets.join(',')
    + '/' + currentPlayer;
}

export function initialState(config: GameConfig = DEFAULT_CONFIG, firstPlayer: Player = 'red'): GameState {
  const discsPerPlayer = Math.ceil(config.rows * config.cols / 2);
  const board = emptyBoard(config.rows, config.cols);
  const rowOffsets = Array(config.rows).fill(0);
  const initHash = hashPosition(board, rowOffsets, firstPlayer, config.maxOffset);
  return {
    config,
    board,
    rowOffsets,
    currentPlayer: firstPlayer,
    discs: { red: discsPerPlayer, black: discsPerPlayer },
    phase: 'playing',
    winners: [],
    winningCells: [],
    lastGravityDrops: [],
    positionCounts: { [initHash]: 1 },
    repetitionWarning: false,
  };
}

function otherPlayer(p: Player): Player {
  return p === 'red' ? 'black' : 'red';
}

function hasMoves(state: GameState, player: Player): boolean {
  const s = { ...state, currentPlayer: player };
  const { rows, cols } = state.config;
  for (let c = 0; c < cols; c++) {
    if (canDrop(s, c)) return true;
  }
  for (let r = 0; r < rows; r++) {
    if (canShift(s, r, 'left') || canShift(s, r, 'right')) return true;
  }
  return false;
}

function advanceTurn(state: GameState): GameState {
  const { winners, winningCells } = checkWin(state.board, state.config);
  if (winners.length > 0) {
    return { ...state, phase: 'won', winners, winningCells };
  }

  const next = otherPlayer(state.currentPlayer);

  // Check if next player has any moves; if not, check if current can continue
  if (!hasMoves({ ...state, currentPlayer: next }, next)) {
    if (!hasMoves(state, state.currentPlayer)) {
      return { ...state, phase: 'draw' };
    }
    // Next player is stuck — skip their turn (stay with current player)
    return state;
  }

  // Track position for 3-move-repetition rule.
  const hash = hashPosition(state.board, state.rowOffsets, next, state.config.maxOffset);
  const count = (state.positionCounts[hash] ?? 0) + 1;
  const positionCounts = { ...state.positionCounts, [hash]: count };

  if (count >= 3) {
    return { ...state, currentPlayer: next, positionCounts, repetitionWarning: false, phase: 'draw' };
  }

  return { ...state, currentPlayer: next, positionCounts, repetitionWarning: count >= 2 };
}

function dropDisc(state: GameState, col: number): GameState {
  const { rows } = state.config;
  let targetRow = -1;
  for (let r = rows - 1; r >= 0; r--) {
    if (state.board[r][col] === null) {
      targetRow = r;
      break;
    }
  }
  if (targetRow === -1) return state;

  const newBoard = state.board.map((row, r) =>
    row.map((cell, c) => (r === targetRow && c === col ? state.currentPlayer : cell))
  );

  const settledBoard = applyGravityAll(newBoard);

  const newDiscs = {
    ...state.discs,
    [state.currentPlayer]: state.discs[state.currentPlayer] - 1,
  };

  return advanceTurn({ ...state, board: settledBoard, discs: newDiscs });
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'DROP_DISC': {
      if (!canDrop(state, action.col)) return state;
      return dropDisc(state, action.col);
    }
    case 'SHIFT_ROW': {
      if (!canShift(state, action.row, action.direction)) return state;
      const { board, reclaimed, gravityDrops } = shiftRow(state.board, action.row, action.direction);
      const newOffsets = state.rowOffsets.map((o, i) =>
        i === action.row ? o + (action.direction === 'left' ? -1 : 1) : o
      );
      const newDiscs = { ...state.discs };
      for (const [player, count] of Object.entries(reclaimed) as [Player, number][]) {
        newDiscs[player] += count;
      }
      return advanceTurn({ ...state, board, rowOffsets: newOffsets, discs: newDiscs, lastGravityDrops: gravityDrops });
    }
    case 'RESIGN':
      return { ...state, phase: 'won', winners: [otherPlayer(action.loser)], winningCells: [] };
    case 'RESET_GAME':
      return initialState(action.config ?? state.config, action.firstPlayer);
  }
}
