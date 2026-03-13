import { useRef, useLayoutEffect, useMemo } from 'react';
import type { Cell as CellType, GameState, Board as BoardType, RowOffsets } from '../types';
import { ROWS, COLS, CELL_WITH_GAP } from '../constants';
import { canDrop, canShift } from '../logic/validation';
import { Cell } from './Cell';
import { ColumnDropTarget } from './ColumnDropTarget';
import { RowShiftControls } from './RowShiftControls';

interface BoardProps {
  gameState: GameState;
  displayBoard: BoardType;
  slotOffsets: RowOffsets;
  transformOffsets: RowOffsets;
  enableDropAnim: boolean;
  onDrop: (col: number) => void;
  onShift: (row: number, direction: 'left' | 'right') => void;
  onShiftTransitionEnd: (row: number) => void;
}

// Build the 5-slot array using slotOffsets (the PRE-shift offset).
// slotOffset 0  → board data at slots [1,2,3]
// slotOffset -1 → board data at slots [2,3,4]
// slotOffset +1 → board data at slots [0,1,2]
// The CSS transform then moves the slider so the correct 3 slots show through the frame.
function getSlots(row: CellType[], slotOffset: number): CellType[] {
  const slots: CellType[] = [null, null, null, null, null];
  const start = 1 - slotOffset;
  for (let i = 0; i < COLS; i++) {
    slots[start + i] = row[i];
  }
  return slots;
}

export function Board({
  gameState,
  displayBoard,
  slotOffsets,
  transformOffsets,
  enableDropAnim,
  onDrop,
  onShift,
  onShiftTransitionEnd,
}: BoardProps) {
  const { winningCells } = gameState;

  // Detect cells that newly received a disc — only when enableDropAnim is true
  const prevBoardRef = useRef<BoardType>(displayBoard);
  const newCells = useMemo(() => {
    if (!enableDropAnim) return new Set<string>();
    const result = new Set<string>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!prevBoardRef.current[r][c] && displayBoard[r][c]) {
          result.add(`${r}-${c}`);
        }
      }
    }
    return result;
  }, [displayBoard, enableDropAnim]);

  useLayoutEffect(() => {
    prevBoardRef.current = displayBoard;
  }, [displayBoard]);

  function isWinning(r: number, c: number) {
    return winningCells.some(([wr, wc]) => wr === r && wc === c);
  }

  return (
    <div className="board-area">
      <div className="drop-targets">
        <div className="shift-spacer" />
        {Array.from({ length: COLS }, (_, c) => (
          <ColumnDropTarget
            key={c}
            col={c}
            disabled={!canDrop(gameState, c)}
            onDrop={() => onDrop(c)}
          />
        ))}
        <div className="shift-spacer" />
      </div>

      <div className="board-rows">
        {Array.from({ length: ROWS }, (_, r) => {
          const slotOff = slotOffsets[r];
          const transformOff = transformOffsets[r];
          const slots = getSlots(displayBoard[r], slotOff);
          // transformOff drives the visible window: -(1 - transformOff) * CELL_WITH_GAP
          const transform = `translateX(${-(1 - transformOff) * CELL_WITH_GAP}px)`;

          return (
            <div key={r} className="board-row-wrapper">
              <RowShiftControls
                row={r}
                side="left"
                canShiftLeft={canShift(gameState, r, 'left')}
                canShiftRight={canShift(gameState, r, 'right')}
                onShiftLeft={() => onShift(r, 'left')}
                onShiftRight={() => onShift(r, 'right')}
              />

              <div className="row-frame">
                <div
                  className="row-slider"
                  style={{ transform }}
                  onTransitionEnd={(e) => {
                    if (e.propertyName === 'transform') onShiftTransitionEnd(r);
                  }}
                >
                  {slots.map((cell, slotIdx) => {
                    const boardCol = slotIdx - (1 - slotOff);
                    const inBounds = boardCol >= 0 && boardCol < COLS;
                    const winning = inBounds && isWinning(r, boardCol);
                    const isNew = inBounds && newCells.has(`${r}-${boardCol}`);
                    return (
                      <Cell
                        key={isNew ? `${r}-${slotIdx}-${cell}-new` : `${r}-${slotIdx}`}
                        player={cell}
                        isWinning={winning}
                        animate={isNew}
                      />
                    );
                  })}
                </div>
              </div>

              <RowShiftControls
                row={r}
                side="right"
                canShiftLeft={canShift(gameState, r, 'left')}
                canShiftRight={canShift(gameState, r, 'right')}
                onShiftLeft={() => onShift(r, 'left')}
                onShiftRight={() => onShift(r, 'right')}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
