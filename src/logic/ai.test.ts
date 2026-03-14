import { describe, it, expect } from 'vitest';
import { getBestMove } from './ai';
import { initialState } from './gameReducer';
import { gameReducer } from './gameReducer';
import type { GameState, Action } from '../types';

// Helper: apply a sequence of actions to the initial state
function applyActions(actions: Action[]): GameState {
  return actions.reduce((s, a) => gameReducer(s, a), initialState());
}

describe('getBestMove — basic sanity', () => {
  it('returns a move on a fresh board', () => {
    const state = initialState();
    const move = getBestMove(state);
    expect(move).not.toBeNull();
    expect(move!.type).toMatch(/DROP_DISC|SHIFT_ROW/);
  });

  it('returns null when phase is won', () => {
    // Red wins by filling column 1 (red, red, red from bottom)
    // Drop order: red col1, black col0, red col1, black col0, red col1
    const state = applyActions([
      { type: 'DROP_DISC', col: 1 },
      { type: 'DROP_DISC', col: 0 },
      { type: 'DROP_DISC', col: 1 },
      { type: 'DROP_DISC', col: 0 },
      { type: 'DROP_DISC', col: 1 },
    ]);
    expect(state.phase).toBe('won');
    expect(getBestMove(state)).toBeNull();
  });
});

describe('getBestMove — takes an immediate win', () => {
  it('drops to complete a column win', () => {
    // Black has two discs in col 2 (rows 2 and 1), row 0 is empty — black wins by dropping col 2.
    // Build: red col0, black col2, red col0, black col2 → now it's red's turn.
    // Then red col1 → black's turn with two in col2, one empty slot above.
    const state = applyActions([
      { type: 'DROP_DISC', col: 0 }, // red
      { type: 'DROP_DISC', col: 2 }, // black
      { type: 'DROP_DISC', col: 0 }, // red
      { type: 'DROP_DISC', col: 2 }, // black
      { type: 'DROP_DISC', col: 1 }, // red — now black's turn
    ]);
    expect(state.currentPlayer).toBe('black');
    expect(state.phase).toBe('playing');

    const move = getBestMove(state);
    expect(move).not.toBeNull();
    expect(move!.type).toBe('DROP_DISC');
    expect((move as Extract<Action, { type: 'DROP_DISC' }>).col).toBe(2);
  });
});

describe('getBestMove — blocks opponent win', () => {
  it('does not let red win immediately', () => {
    // Red has two discs in col 0 (rows 2 and 1); dropping col 0 would win.
    // Build: red col0, black col2, red col0, black col1, red col2 → black's turn.
    const state = applyActions([
      { type: 'DROP_DISC', col: 0 }, // red  row2
      { type: 'DROP_DISC', col: 2 }, // black row2
      { type: 'DROP_DISC', col: 0 }, // red  row1
      { type: 'DROP_DISC', col: 1 }, // black row2
      { type: 'DROP_DISC', col: 2 }, // red  row1 — black's turn
    ]);
    expect(state.currentPlayer).toBe('black');

    const move = getBestMove(state);
    expect(move).not.toBeNull();

    // After black's move, red should not be able to win immediately on the next turn.
    const afterBlack = gameReducer(state, move!);
    expect(afterBlack.phase).not.toBe('won'); // black's move didn't accidentally win for red
    // Red's turn: none of red's moves should produce an immediate win
    const redMoves = [0, 1, 2].map(col => ({ type: 'DROP_DISC' as const, col }));
    const redWinsImmediately = redMoves.some(a => {
      const s = gameReducer(afterBlack, a);
      return s.phase === 'won' && s.winners.includes('red');
    });
    expect(redWinsImmediately).toBe(false);
  });
});

describe('getBestMove — works after a row shift', () => {
  it('returns a move when rows have non-zero offsets', () => {
    // Shift row 0 right (legal from offset 0), then it's black's turn
    const state = applyActions([
      { type: 'DROP_DISC', col: 0 }, // red
      { type: 'SHIFT_ROW', row: 2, direction: 'right' }, // black shifts
      { type: 'DROP_DISC', col: 1 }, // red
    ]);
    // Now it's black's turn with a shifted board
    expect(state.currentPlayer).toBe('black');
    const move = getBestMove(state);
    expect(move).not.toBeNull();
  });

  it('returns a move when all rows are at max offset', () => {
    const state = applyActions([
      { type: 'SHIFT_ROW', row: 0, direction: 'right' }, // red
      { type: 'SHIFT_ROW', row: 1, direction: 'right' }, // black
      { type: 'SHIFT_ROW', row: 2, direction: 'right' }, // red
    ]);
    expect(state.currentPlayer).toBe('black');
    const move = getBestMove(state);
    expect(move).not.toBeNull();
    // No more right-shifts are legal (all at +1), so move must be a drop or left-shift
    if (move!.type === 'SHIFT_ROW') {
      expect((move as Extract<Action, { type: 'SHIFT_ROW' }>).direction).toBe('left');
    }
  });
});

describe('getBestMove — prefers win over block', () => {
  it('takes its own win rather than blocking an opponent threat', () => {
    // Both players have two-in-a-row; it is black's turn and black can win immediately.
    // Red threatens col 1; black can win via col 2.
    // Build so black has rows 2,1 in col 2 and red has rows 2,1 in col 1.
    const state = applyActions([
      { type: 'DROP_DISC', col: 1 }, // red   row2 col1
      { type: 'DROP_DISC', col: 2 }, // black row2 col2
      { type: 'DROP_DISC', col: 1 }, // red   row1 col1
      { type: 'DROP_DISC', col: 2 }, // black row1 col2
      { type: 'DROP_DISC', col: 0 }, // red   row2 col0 (filler, not col1 win yet)
    ]);
    expect(state.currentPlayer).toBe('black');
    const move = getBestMove(state);
    expect(move).not.toBeNull();
    expect(move!.type).toBe('DROP_DISC');
    expect((move as Extract<Action, { type: 'DROP_DISC' }>).col).toBe(2);
  });
});
