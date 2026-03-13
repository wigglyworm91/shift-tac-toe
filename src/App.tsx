import { useReducer, useState, useRef, useEffect } from 'react';
import type { Board as BoardType, RowOffsets } from './types';
import { gameReducer, initialState } from './logic/gameReducer';
import { Board } from './components/Board';
import { DiscCounter } from './components/DiscCounter';
import { PlayerBanner } from './components/PlayerBanner';
import './App.css';

export function App() {
  const [gameState, dispatch] = useReducer(gameReducer, undefined, initialState);

  // Display state — what the board actually renders. During a shift animation,
  // displayBoard holds the PRE-shift board while displayOffsets reflects the
  // new (post-shift) offset so the CSS transition plays. After the transition
  // ends, displayBoard snaps to gameState.board.
  const [displayBoard, setDisplayBoard] = useState<BoardType>(() => initialState().board);
  const [displayOffsets, setDisplayOffsets] = useState<RowOffsets>([0, 0, 0]);

  const shiftAnimatingRef = useRef(false);
  const animatingRowRef = useRef<number | null>(null);
  // Always-fresh refs so callbacks aren't stale
  const latestBoardRef = useRef(gameState.board);
  const latestOffsetsRef = useRef(gameState.rowOffsets);
  latestBoardRef.current = gameState.board;
  latestOffsetsRef.current = gameState.rowOffsets;

  // Sync display state for drops and resets (any action that isn't a shift)
  useEffect(() => {
    if (!shiftAnimatingRef.current) {
      setDisplayBoard(gameState.board);
      setDisplayOffsets(gameState.rowOffsets);
    }
  }, [gameState.board, gameState.rowOffsets]);

  function handleDrop(col: number) {
    dispatch({ type: 'DROP_DISC', col });
    // useEffect above will sync displayBoard after re-render
  }

  function handleShift(row: number, direction: 'left' | 'right') {
    const preBoard = gameState.board; // capture before dispatch
    dispatch({ type: 'SHIFT_ROW', row, direction });

    shiftAnimatingRef.current = true;
    animatingRowRef.current = row;

    // Keep showing the pre-shift board; only change offsets to trigger the CSS transition
    setDisplayBoard(preBoard);
    setDisplayOffsets(prev => {
      const next = [...prev] as RowOffsets;
      next[row] = prev[row] + (direction === 'left' ? -1 : 1);
      return next;
    });
  }

  function handleShiftTransitionEnd(row: number) {
    if (row !== animatingRowRef.current || !shiftAnimatingRef.current) return;
    shiftAnimatingRef.current = false;
    animatingRowRef.current = null;
    // Snap board to settled post-shift state; any gravity-dropped discs appear here
    setDisplayBoard(latestBoardRef.current);
    setDisplayOffsets(latestOffsetsRef.current);
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
        displayOffsets={displayOffsets}
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
