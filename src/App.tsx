import { useReducer, useState, useRef, useEffect } from 'react';
import { trackEvent } from './analytics';
import type { Board as BoardType } from './types';
import { gameReducer, initialState } from './logic/gameReducer';
import { getBestMove, type Difficulty } from './logic/ai';
import { Board } from './components/Board';
import { DiscCounter } from './components/DiscCounter';
import { PlayerBanner } from './components/PlayerBanner';
import { Lobby, type LobbyChoice, type LobbySelections } from './components/Lobby';
import { RulesModal } from './components/RulesModal';
import { playDropSound, playShiftSound, playWinSound, playLoseSound, playDrawSound, playGameStartSound, playRematchSound } from './sounds';
import { useMultiplayer } from './multiplayer/useMultiplayer';
import { OnlineLobby } from './multiplayer/OnlineLobby';
import './App.css';

function hasRoomCodeInUrl(): boolean {
  const base = import.meta.env.BASE_URL as string;
  const basePath = base.endsWith('/') ? base.slice(0, -1) : base;
  const path = window.location.pathname.slice(basePath.length);
  return /^\/game\/[A-Z0-9]{6}$/i.test(path);
}

export function App() {
  // 'lobby' | 'game' — skip lobby if joining via URL room code
  const [screen, setScreen] = useState<'lobby' | 'game'>('game');
  const [mode, setMode] = useState<'0p' | '1p' | '2p' | 'online'>(() =>
    hasRoomCodeInUrl() ? 'online' : '1p'
  );
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [lobbySelections, setLobbySelections] = useState<LobbySelections>({
    board: '3x3', shifting: 'once', mode: '1p', aiDifficulty: 'easy',
    customRows: 4, customCols: 4, customWinLength: 3,
  });
  const [gameState, dispatch] = useReducer(gameReducer, undefined, () =>
    initialState(undefined, hasRoomCodeInUrl() ? 'red' : (Math.random() < 0.5 ? 'red' : 'black'))
  );

  const { mpState, shareUrl, myColor, username, setUsername, opponentName,
    createRoom, sendAction, disconnect, lastOpponentAction,
    rematchState, rematchAccepted, offerRematch, acceptRematch,
    spectatorNames, initialActions, clearInitialActions } = useMultiplayer();

  // displayBoard: what cells are rendered. Frozen at pre-shift state during animation.
  const [displayBoard, setDisplayBoard] = useState<BoardType>(() => initialState().board);

  // slotOffsets: used by getSlots() to place board data into the 5-slot array.
  // Stays at the OLD value during animation so data stays in its original positions.
  const [slotOffsets, setSlotOffsets] = useState<number[]>(() => initialState().rowOffsets);

  // transformOffsets: drives the CSS translateX on the slider.
  // Updated immediately on shift to trigger the CSS transition.
  const [transformOffsets, setTransformOffsets] = useState<number[]>(() => initialState().rowOffsets);

  // Only play drop-in animation on explicit DROP actions, not after shift snaps.
  const [enableDropAnim, setEnableDropAnim] = useState(false);

  // Increments each time a shift animation ends — used as a dep so the AI
  // effect re-runs after a human shift (shiftAnimatingRef alone isn't a React dep).
  const [shiftAnimEndKey, setShiftAnimEndKey] = useState(0);

  const isOnlineCreatorRef = useRef(false);
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

  // AI: trigger a move when it's the AI's turn (1p = black only; 0p = both players).
  const aiThinkingRef = useRef(false);
  useEffect(() => {
    const isAiMove = (mode === '1p' && gameState.currentPlayer === 'black') || mode === '0p';
    if (
      !isAiMove ||
      gameState.phase !== 'playing' ||
      shiftAnimatingRef.current ||
      aiThinkingRef.current
    ) return;

    aiThinkingRef.current = true;
    const timer = setTimeout(() => {
      const moveDifficulty = mode === '0p' ? 'impossible' : difficulty;
      const action = getBestMove(gameState, moveDifficulty);
      aiThinkingRef.current = false;
      console.log('[AI] got action:', action);
      if (!action) return;
      if (action.type === 'DROP_DISC') handleDrop(action.col);
      else if (action.type === 'SHIFT_ROW') handleShift(action.row, action.direction);
    }, mode === '0p' ? 300 : 500);
    return () => { clearTimeout(timer); aiThinkingRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gameState.phase, gameState.currentPlayer, gameState.board, shiftAnimEndKey]);

  // Online: reset the board when a new online game starts.
  // Creator also sends their config to the joiner so both boards match.
  useEffect(() => {
    if (mpState !== 'playing') return;
    handleReset(false);
    playGameStartSound();
    if (isOnlineCreatorRef.current) {
      sendAction({ type: 'RESET_GAME', config: gameState.config, firstPlayer: 'red' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpState]);

  // Online: reset board when rematch is agreed (counter increments on both sides).
  useEffect(() => {
    if (rematchAccepted === 0) return;
    handleReset(false);
    playGameStartSound();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rematchAccepted]);

  // Online: play sound when opponent offers a rematch.
  useEffect(() => {
    if (rematchState === 'received') playRematchSound();
  }, [rematchState]);

  // Spectator: replay the full action log when we first join a game in progress.
  useEffect(() => {
    if (mpState !== 'spectating' || initialActions === null) return;
    // Reset to a clean slate, then replay all logged actions.
    // React 18 batches these dispatches into a single render.
    dispatch({ type: 'RESET_GAME', firstPlayer: 'red' });
    for (const action of initialActions) {
      dispatch(action);
    }
    shiftAnimatingRef.current = false;
    animatingRowRef.current = null;
    clearInitialActions();
    playGameStartSound();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mpState, initialActions]);

  // Online: apply incoming opponent actions.
  useEffect(() => {
    if (!lastOpponentAction) return;
    if (lastOpponentAction.type === 'DROP_DISC') {
      handleDrop(lastOpponentAction.col, true);
    } else if (lastOpponentAction.type === 'SHIFT_ROW') {
      handleShift(lastOpponentAction.row, lastOpponentAction.direction, true);
    } else if (lastOpponentAction.type === 'RESET_GAME') {
      // Apply the opponent's config (creator → joiner sync).
      dispatch({ type: 'RESET_GAME', firstPlayer: 'red', config: lastOpponentAction.config });
      shiftAnimatingRef.current = false;
      animatingRowRef.current = null;
      aiThinkingRef.current = false;
    } else if (lastOpponentAction.type === 'RESIGN') {
      dispatch({ type: 'RESIGN', loser: lastOpponentAction.loser });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOpponentAction]);

  // Analytics: track game start and end.
  const prevPhaseRef = useRef<typeof gameState.phase | null>(null);
  useEffect(() => {
    if (gameState.phase === prevPhaseRef.current) return;
    prevPhaseRef.current = gameState.phase;

    if (gameState.phase === 'playing') {
      trackEvent('game_start', { mode, ...(mode === '1p' ? { difficulty } : {}) });
    } else if (gameState.phase === 'won' || gameState.phase === 'draw') {
      const result = gameState.phase === 'draw' ? 'draw'
        : gameState.winners.length === 2 ? 'both'
        : gameState.winners[0];
      trackEvent('game_end', { mode, result });

      if (gameState.phase === 'draw') {
        playDrawSound();
      } else {
        // Determine if the local player won
        const localColor = mode === 'online' ? myColor : mode === '1p' ? 'red' : null;
        const localWon = localColor === null || gameState.winners.includes(localColor);
        if (localWon) playWinSound(); else playLoseSound();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.phase]);

  const isAiTurn = (mode === '1p' && gameState.currentPlayer === 'black' || mode === '0p') && gameState.phase === 'playing';
  const isOnlineOpponentTurn = mode === 'online' && myColor !== null && gameState.currentPlayer !== myColor;
  const boardDisabled = isAiTurn || isOnlineOpponentTurn || mpState === 'spectating';

  // remote=true means this action came from the opponent — don't echo it back to the server.
  function handleDrop(col: number, remote = false) {
    playDropSound(col);
    dispatch({ type: 'DROP_DISC', col });
    if (mode === 'online' && !remote) sendAction({ type: 'DROP_DISC', col });
  }

  function handleShift(row: number, direction: 'left' | 'right', remote = false) {
    const preBoard = gameState.board;
    const oldSlotOffsets = slotOffsets; // capture before any state change
    playShiftSound(direction);
    dispatch({ type: 'SHIFT_ROW', row, direction });
    if (mode === 'online' && !remote) sendAction({ type: 'SHIFT_ROW', row, direction });

    shiftAnimatingRef.current = true;
    animatingRowRef.current = row;

    // Freeze board + slot offsets at pre-shift state so disc positions don't jump.
    setDisplayBoard(preBoard);
    setSlotOffsets([...oldSlotOffsets]);
    setEnableDropAnim(false);

    // Only update transformOffsets — this triggers the CSS transition.
    setTransformOffsets(prev => {
      const next = [...prev];
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

  function randomPlayer(): 'red' | 'black' {
    return Math.random() < 0.5 ? 'red' : 'black';
  }

  function handleReset(is1p = mode === '1p') {
    dispatch({ type: 'RESET_GAME', firstPlayer: is1p ? randomPlayer() : 'red' });
    shiftAnimatingRef.current = false;
    animatingRowRef.current = null;
    aiThinkingRef.current = false;
    // useEffect will sync on next render
  }

  function handleLobbyPlay(choice: LobbyChoice) {
    shiftAnimatingRef.current = false;
    animatingRowRef.current = null;
    aiThinkingRef.current = false;

    if (choice.mode === 'online') {
      if (mode === 'online') disconnect();
      isOnlineCreatorRef.current = true;
      setMode('online');
      dispatch({ type: 'RESET_GAME', config: choice.config, firstPlayer: 'red' });
      setScreen('game');
      createRoom();
      return;
    }

    const firstPlayer = (choice.mode === '1p' || choice.mode === '0p') ? randomPlayer() : 'red';
    if (mode === 'online') disconnect();
    if (choice.mode === '1p') setDifficulty(choice.difficulty);
    setMode(choice.mode);
    dispatch({ type: 'RESET_GAME', config: choice.config, firstPlayer });
    setScreen('game');
  }

  function handleBackToLobby() {
    if (mode === 'online') disconnect();
    setScreen('lobby');
  }

  const footer = (
    <footer className="app-footer">
      <button className="footer-btn" onClick={() => setRulesOpen(true)}>How to play</button>
      <a className="footer-link" href="https://github.com/wigglyworm91/shift-tac-toe" target="_blank" rel="noreferrer">GitHub</a>
    </footer>
  );

  if (screen === 'lobby') {
    return (
      <>
        <Lobby selections={lobbySelections} onChange={setLobbySelections} onPlay={handleLobbyPlay} username={username} onUsernameChange={setUsername} />
        {footer}
        <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </>
    );
  }

  return (
    <>
    <div className="game">
      <h1 className="title">Shift Tac Toe</h1>

      {mode === 'online' && mpState !== 'playing' && mpState !== 'spectating' ? (
        <OnlineLobby
          mpState={mpState}
          shareUrl={shareUrl}
          onDisconnect={() => {
            disconnect();
            setScreen('lobby');
          }}
        />
      ) : (
        <>
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
            mode={mode}
            isOnlineOpponentTurn={isOnlineOpponentTurn}
          />

          {mode === 'online' && mpState === 'spectating' && spectatorNames ? (
            <p className="opponent-name spectator-label">
              Spectating: {spectatorNames.red} vs {spectatorNames.black}
            </p>
          ) : mode === 'online' && opponentName ? (
            <p className="opponent-name">vs. {opponentName}</p>
          ) : null}

          <Board
            gameState={gameState}
            displayBoard={displayBoard}
            slotOffsets={slotOffsets}
            transformOffsets={transformOffsets}
            enableDropAnim={enableDropAnim}
            onDrop={handleDrop}
            onShift={handleShift}
            onShiftTransitionEnd={handleShiftTransitionEnd}
            disabled={boardDisabled}
          />

          {gameState.repetitionWarning && gameState.phase === 'playing' && (
            <div className="repetition-warning">
              Repeated position — one more repetition = draw
            </div>
          )}

          {mode === 'online' && mpState !== 'spectating' && gameState.phase !== 'playing' && (
            <div className="rematch-row">
              {rematchState === 'none' && (
                <button className="lobby-btn" onClick={offerRematch}>Offer Rematch</button>
              )}
              {rematchState === 'offered' && (
                <p className="rematch-waiting">Waiting for opponent…</p>
              )}
              {rematchState === 'received' && (
                <button className="lobby-btn rematch-glow" onClick={acceptRematch}>Accept Rematch</button>
              )}
            </div>
          )}
        </>
      )}

      <div className="game-btns">
        <button className="back-btn" onClick={handleBackToLobby}>← New Game</button>
        {mpState !== 'spectating' && (mode === 'online' ? (
          <button
            className="back-btn"
            disabled={gameState.phase !== 'playing'}
            onClick={() => {
              if (!myColor || gameState.phase !== 'playing') return;
              dispatch({ type: 'RESIGN', loser: myColor });
              sendAction({ type: 'RESIGN', loser: myColor });
            }}
          >Resign</button>
        ) : (
          <button className="back-btn" onClick={() => handleReset()}>Restart</button>
        ))}
      </div>
    </div>
    {footer}
    <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  );
}
