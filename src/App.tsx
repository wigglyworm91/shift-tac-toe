import { useReducer, useState, useRef, useEffect } from 'react';
import type { Board as BoardType, RowOffsets } from './types';
import { gameReducer, initialState } from './logic/gameReducer';
import { getBestMove, type Difficulty } from './logic/ai';
import { Board } from './components/Board';
import { DiscCounter } from './components/DiscCounter';
import { PlayerBanner } from './components/PlayerBanner';
import { playDropSound, playShiftSound } from './sounds';
import './App.css';

export function App() {
  const [mode, setMode] = useState<'1p' | '2p'>('2p');
  const [difficulty, setDifficulty] = useState<Difficulty>('impossible');
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

  // Increments each time a shift animation ends — used as a dep so the AI
  // effect re-runs after a human shift (shiftAnimatingRef alone isn't a React dep).
  const [shiftAnimEndKey, setShiftAnimEndKey] = useState(0);

  const shiftAnimatingRef = useRef(false);
  const animatingRowRef = useRef<number | null>(null);
  const latestBoardRef = useRef(gameState.board);
  const latestOffsetsRef = useRef(gameState.rowOffsets);
  const latestGravityDropsRef = useRef(gameState.lastGravityDrops);
  latestBoardRef.current = gameState.board;
  latestOffsetsRef.current = gameState.rowOffsets;
  latestGravityDropsRef.current = gameState.lastGravityDrops;

  // Sync display state for non-shift actions (drops, resets).
  useEffect(() => {
    if (!shiftAnimatingRef.current) {
      setDisplayBoard(gameState.board);
      setSlotOffsets(gameState.rowOffsets);
      setTransformOffsets(gameState.rowOffsets);
      setEnableDropAnim(true);
    }
  }, [gameState.board, gameState.rowOffsets]);

  // AI: trigger a move when it's black's turn in 1P mode.
  const aiThinkingRef = useRef(false);
  useEffect(() => {
    if (
      mode !== '1p' ||
      gameState.phase !== 'playing' ||
      gameState.currentPlayer !== 'black' ||
      shiftAnimatingRef.current ||
      aiThinkingRef.current
    ) return;

    aiThinkingRef.current = true;
    const timer = setTimeout(() => {
      const action = getBestMove(gameState, difficulty);
      aiThinkingRef.current = false;
      if (!action) return;
      if (action.type === 'DROP_DISC') handleDrop(action.col);
      else if (action.type === 'SHIFT_ROW') handleShift(action.row, action.direction);
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gameState.phase, gameState.currentPlayer, gameState.board, shiftAnimEndKey]);

  const isAiTurn = mode === '1p' && gameState.currentPlayer === 'black' && gameState.phase === 'playing';

  function handleDrop(col: number) {
    playDropSound(col);
    dispatch({ type: 'DROP_DISC', col });
  }

  function handleShift(row: number, direction: 'left' | 'right') {
    const preBoard = gameState.board;
    const oldSlotOffsets = slotOffsets; // capture before any state change
    playShiftSound(direction);
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
    // Play clack for each disc that landed due to gravity after the shift.
    latestGravityDropsRef.current.forEach(([, c], i) => playDropSound(c, i * 0.04));

    // Snap board and both offset arrays to actual post-shift state.
    setDisplayBoard(latestBoardRef.current);
    setSlotOffsets(latestOffsetsRef.current);
    setTransformOffsets(latestOffsetsRef.current);
    // Leave enableDropAnim false — post-shift snap should not play drop animations.
    // Bump key so the AI useEffect re-runs now that the animation is done.
    setShiftAnimEndKey(k => k + 1);
  }

  function handleReset() {
    dispatch({ type: 'RESET_GAME' });
    shiftAnimatingRef.current = false;
    animatingRowRef.current = null;
    aiThinkingRef.current = false;
    // useEffect will sync on next render
  }

  function handleModeChange(newMode: '1p' | '2p') {
    setMode(newMode);
    handleReset();
  }

  function handleAiGame(diff: Difficulty) {
    setDifficulty(diff);
    setMode('1p');
    handleReset();
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
        isAiTurn={isAiTurn}
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
        disabled={isAiTurn}
      />

      <div className="new-game-btns">
        <button className="new-game-btn" onClick={() => handleModeChange('2p')}>
          vs Player
        </button>
        <button
          className={`new-game-btn${mode === '1p' && difficulty === 'easy' ? ' active' : ''}`}
          onClick={() => handleAiGame('easy')}
        >
          Easy
        </button>
        <button
          className={`new-game-btn${mode === '1p' && difficulty === 'hard' ? ' active' : ''}`}
          onClick={() => handleAiGame('hard')}
        >
          Hard
        </button>
        <button
          className={`new-game-btn${mode === '1p' && difficulty === 'impossible' ? ' active' : ''}`}
          onClick={() => handleAiGame('impossible')}
        >
          Impossible
        </button>
      </div>
    </div>
  );
}
