import type { GameState } from '../types';
import { ROWS, COLS } from '../constants';
import { canDrop, canShift } from '../logic/validation';
import { Cell } from './Cell';
import { ColumnDropTarget } from './ColumnDropTarget';
import { RowShiftControls } from './RowShiftControls';

interface BoardProps {
  state: GameState;
  onDrop: (col: number) => void;
  onShift: (row: number, direction: 'left' | 'right') => void;
}

export function Board({ state, onDrop, onShift }: BoardProps) {
  const { board, rowOffsets, winningCells } = state;

  function isWinning(r: number, c: number) {
    return winningCells.some(([wr, wc]) => wr === r && wc === c);
  }

  return (
    <div className="board-area">
      {/* Drop target row */}
      <div className="drop-targets">
        <div className="shift-spacer" />
        {Array.from({ length: COLS }, (_, c) => (
          <ColumnDropTarget
            key={c}
            col={c}
            disabled={!canDrop(state, c)}
            onDrop={() => onDrop(c)}
          />
        ))}
        <div className="shift-spacer" />
      </div>

      {/* Board rows with shift controls */}
      <div className="board-clip">
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} className="board-row-wrapper">
            <RowShiftControls
              row={r}
              side="left"
              canShiftLeft={canShift(state, r, 'left')}
              canShiftRight={canShift(state, r, 'right')}
              onShiftLeft={() => onShift(r, 'left')}
              onShiftRight={() => onShift(r, 'right')}
            />
            <div
              className={`board-row offset-${rowOffsets[r]}`}
            >
              {Array.from({ length: COLS }, (_, c) => (
                <Cell
                  key={c}
                  player={board[r][c]}
                  isWinning={isWinning(r, c)}
                />
              ))}
            </div>
            <RowShiftControls
              row={r}
              side="right"
              canShiftLeft={canShift(state, r, 'left')}
              canShiftRight={canShift(state, r, 'right')}
              onShiftLeft={() => onShift(r, 'left')}
              onShiftRight={() => onShift(r, 'right')}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
