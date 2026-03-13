import type { GameState, Action, Player, Board, RowOffsets } from '../types';
import { ROWS, COLS, DISCS_PER_PLAYER } from '../constants';
import { applyGravityAll } from './gravity';
import { shiftRow } from './shift';
import { checkWin } from './winDetection';
import { canDrop, canShift } from './validation';

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function initialState(): GameState {
  return {
    board: emptyBoard(),
    rowOffsets: [0, 0, 0],
    currentPlayer: 'red',
    discs: { red: DISCS_PER_PLAYER, black: DISCS_PER_PLAYER },
    phase: 'playing',
    winners: [],
    winningCells: [],
    lastGravityDrops: [],
  };
}

function otherPlayer(p: Player): Player {
  return p === 'red' ? 'black' : 'red';
}

function hasMoves(state: GameState, player: Player): boolean {
  const s = { ...state, currentPlayer: player };
  for (let c = 0; c < COLS; c++) {
    if (canDrop(s, c)) return true;
  }
  for (let r = 0; r < ROWS; r++) {
    if (canShift(s, r, 'left') || canShift(s, r, 'right')) return true;
  }
  return false;
}

function advanceTurn(state: GameState): GameState {
  const { winners, winningCells } = checkWin(state.board);
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

  return { ...state, currentPlayer: next };
}

function dropDisc(state: GameState, col: number): GameState {
  let targetRow = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r][col] === null) {
      targetRow = r;
      break;
    }
  }
  if (targetRow === -1) return state;

  const newBoard = state.board.map((row, r) =>
    row.map((cell, c) => (r === targetRow && c === col ? state.currentPlayer : cell))
  );

  // Apply gravity after drop (disc already falls to lowest empty, but just in case)
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
      ) as RowOffsets;
      const newDiscs = { ...state.discs };
      for (const [player, count] of Object.entries(reclaimed) as [Player, number][]) {
        newDiscs[player] += count;
      }
      return advanceTurn({ ...state, board, rowOffsets: newOffsets, discs: newDiscs, lastGravityDrops: gravityDrops });
    }
    case 'RESET_GAME':
      return initialState();
  }
}
