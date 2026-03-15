import { useRef, useLayoutEffect, useMemo } from 'react';
import type { Cell as CellType, GameState, Board as BoardType } from '../types';
import { CELL_WITH_GAP } from '../constants';
import { canDrop, canShift } from '../logic/validation';
import { Cell } from './Cell';
import { ColumnDropTarget } from './ColumnDropTarget';
import { RowShiftControls } from './RowShiftControls';

interface BoardProps {
  gameState: GameState;
  displayBoard: BoardType;
  slotOffsets: number[];
  transformOffsets: number[];
  enableDropAnim: boolean;
  onDrop: (col: number) => void;
  onShift: (row: number, direction: 'left' | 'right') => void;
  onShiftTransitionEnd: (row: number) => void;
  disabled?: boolean;
}

// Build the slider slot array using slotOffsets (the PRE-shift offset).
// slotOffset  0 → board data at slots [maxOffset .. maxOffset+cols-1]
// slotOffset -1 → board data shifts right by 1
// slotOffset +1 → board data shifts left by 1
function getSlots(row: CellType[], slotOffset: number, cols: number, maxOffset: number): CellType[] {
  const totalSlots = cols + maxOffset * 2;
  const slots: CellType[] = Array(totalSlots).fill(null);
  const start = maxOffset - slotOffset;
  for (let i = 0; i < cols; i++) {
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
  disabled = false,
}: BoardProps) {
  const { winningCells, config } = gameState;
  const { rows, cols, maxOffset } = config;

  // Detect cells that newly received a disc — only when enableDropAnim is true
  const prevBoardRef = useRef<BoardType>(displayBoard);
  const newCells = useMemo(() => {
    if (!enableDropAnim) return new Set<string>();
    const result = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!prevBoardRef.current[r][c] && displayBoard[r][c]) {
          result.add(`${r}-${c}`);
        }
      }
    }
    return result;
  }, [displayBoard, enableDropAnim, rows, cols]);

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
        {Array.from({ length: cols }, (_, c) => (
          <ColumnDropTarget
            key={c}
            col={c}
            disabled={disabled || !canDrop(gameState, c)}
            onDrop={() => onDrop(c)}
          />
        ))}
        <div className="shift-spacer" />
      </div>

      <div className="board-rows">
        {Array.from({ length: rows }, (_, r) => {
          const slotOff = slotOffsets[r];
          const transformOff = transformOffsets[r];
          const slots = getSlots(displayBoard[r], slotOff, cols, maxOffset);
          const transform = `translateX(${-(maxOffset - transformOff) * CELL_WITH_GAP}px)`;

          return (
            <div key={r} className="board-row-wrapper">
              <RowShiftControls
                row={r}
                side="left"
                canShiftLeft={!disabled && canShift(gameState, r, 'left')}
                canShiftRight={!disabled && canShift(gameState, r, 'right')}
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
                    const boardCol = slotIdx - (maxOffset - slotOff);
                    const inBounds = boardCol >= 0 && boardCol < cols;
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
                canShiftLeft={!disabled && canShift(gameState, r, 'left')}
                canShiftRight={!disabled && canShift(gameState, r, 'right')}
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
