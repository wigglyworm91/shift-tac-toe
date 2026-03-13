import { useReducer, useState, useRef, useEffect } from 'react';
import type { Board as BoardType, RowOffsets } from './types';
import { gameReducer, initialState } from './logic/gameReducer';
import { Board } from './components/Board';
import { DiscCounter } from './components/DiscCounter';
import { PlayerBanner } from './components/PlayerBanner';
import './App.css';

export function App() {
  const [gameState, dispatch] = useReducer(gameReducer, undefined, initialState);

  // displayBoard: what cells are rendered. Frozen at pre-shift state during animation.
  const [displayBoard, setDisplayBoard] = useState<BoardType>(() => initialState().board);

  // slotOffsets: used by getSlots() to place board data into the 5-slot array.
  // Stays at the OLD value during animation so data stays in its original positions.
  const [slotOffsets, setSlotOffsets] = useState<RowOffsets>([0, 0, 0]);

  // transformOffsets: drives the CSS translateX on the slider.
  // Updated immediately on shift to trigger the CSS transition.
  const [transformOffsets, setTransformOffsets] = useState<RowOffsets>([0, 0, 0]);

  // Only play drop-in animation on explicit DROP actions, not after shift snaps.
  const [enableDropAnim, setEnableDropAnim] = useState(false);

  const shiftAnimatingRef = useRef(false);
  const animatingRowRef = useRef<number | null>(null);
  const latestBoardRef = useRef(gameState.board);
  const latestOffsetsRef = useRef(gameState.rowOffsets);
  latestBoardRef.current = gameState.board;
  latestOffsetsRef.current = gameState.rowOffsets;

  // Sync display state for non-shift actions (drops, resets).
  useEffect(() => {
    if (!shiftAnimatingRef.current) {
      setDisplayBoard(gameState.board);
      setSlotOffsets(gameState.rowOffsets);
      setTransformOffsets(gameState.rowOffsets);
      setEnableDropAnim(true);
    }
  }, [gameState.board, gameState.rowOffsets]);

  function handleDrop(col: number) {
    dispatch({ type: 'DROP_DISC', col });
  }

  function handleShift(row: number, direction: 'left' | 'right') {
    const preBoard = gameState.board;
    const oldSlotOffsets = slotOffsets; // capture before any state change
    dispatch({ type: 'SHIFT_ROW', row, direction });

    shiftAnimatingRef.current = true;
    animatingRowRef.current = row;

    // Freeze board + slot offsets at pre-shift state so disc positions don't jump.
    setDisplayBoard(preBoard);
    setSlotOffsets([...oldSlotOffsets] as RowOffsets);
    setEnableDropAnim(false);

    // Only update transformOffsets — this triggers the CSS transition.
    setTransformOffsets(prev => {
      const next = [...prev] as RowOffsets;
      next[row] = prev[row] + (direction === 'left' ? -1 : 1);
      return next;
    });
  }

  function handleShiftTransitionEnd(row: number) {
    if (row !== animatingRowRef.current || !shiftAnimatingRef.current) return;
    shiftAnimatingRef.current = false;
    animatingRowRef.current = null;
    // Snap board and both offset arrays to actual post-shift state.
    setDisplayBoard(latestBoardRef.current);
    setSlotOffsets(latestOffsetsRef.current);
    setTransformOffsets(latestOffsetsRef.current);
    // Leave enableDropAnim false — post-shift snap should not play drop animations.
  }

  function handleReset() {
    dispatch({ type: 'RESET_GAME' });
    shiftAnimatingRef.current = false;
    animatingRowRef.current = null;
    // useEffect will sync on next render
  }

  return (
    <div className="game">
      <h1 className="title">Shift Tac Toe</h1>

      <div className="counters">
        <DiscCounter
          player="red"
          count={gameState.discs.red}
          isCurrentPlayer={gameState.currentPlayer === 'red'}
        />
        <DiscCounter
          player="black"
          count={gameState.discs.black}
          isCurrentPlayer={gameState.currentPlayer === 'black'}
        />
      </div>

      <PlayerBanner
        currentPlayer={gameState.currentPlayer}
        phase={gameState.phase}
        winners={gameState.winners}
      />

      <Board
        gameState={gameState}
        displayBoard={displayBoard}
        slotOffsets={slotOffsets}
        transformOffsets={transformOffsets}
        enableDropAnim={enableDropAnim}
        onDrop={handleDrop}
        onShift={handleShift}
        onShiftTransitionEnd={handleShiftTransitionEnd}
      />

      <button className="new-game-btn" onClick={handleReset}>
        New Game
      </button>
    </div>
  );
}
