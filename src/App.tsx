import { useReducer } from 'react';
import { gameReducer, initialState } from './logic/gameReducer';
import { Board } from './components/Board';
import { DiscCounter } from './components/DiscCounter';
import { PlayerBanner } from './components/PlayerBanner';
import './App.css';

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);

  function handleDrop(col: number) {
    dispatch({ type: 'DROP_DISC', col });
  }

  function handleShift(row: number, direction: 'left' | 'right') {
    dispatch({ type: 'SHIFT_ROW', row, direction });
  }

  function handleReset() {
    dispatch({ type: 'RESET_GAME' });
  }

  return (
    <div className="game">
      <h1 className="title">Shift Tac Toe</h1>

      <div className="counters">
        <DiscCounter
          player="red"
          count={state.discs.red}
          isCurrentPlayer={state.currentPlayer === 'red'}
        />
        <DiscCounter
          player="black"
          count={state.discs.black}
          isCurrentPlayer={state.currentPlayer === 'black'}
        />
      </div>

      <PlayerBanner
        currentPlayer={state.currentPlayer}
        phase={state.phase}
        winners={state.winners}
      />

      <Board state={state} onDrop={handleDrop} onShift={handleShift} />

      <button className="new-game-btn secondary" onClick={handleReset}>
        New Game
      </button>

    </div>
  );
}
