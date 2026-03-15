import { useState } from 'react';
import type { GameConfig } from '../types';
import type { Difficulty } from '../logic/ai';

type BoardKey = '3x3' | '6x7';
type ShiftKey = 'off' | 'once' | 'unlimited';
type ModeKey = '2p' | '1p-easy' | '1p-hard' | '1p-impossible' | 'online';

const BOARD_CONFIGS: Record<BoardKey, Omit<GameConfig, 'maxOffset'>> = {
  '3x3': { rows: 3, cols: 3, winLength: 3 },
  '6x7': { rows: 6, cols: 7, winLength: 4 },
};

const MAX_OFFSETS: Record<ShiftKey, number> = {
  off:       0,
  once:      1,
  unlimited: 1000,
};

export type LobbyChoice =
  | { config: GameConfig; mode: '2p' }
  | { config: GameConfig; mode: '1p'; difficulty: Difficulty }
  | { config: GameConfig; mode: 'online' };

interface LobbyProps {
  onPlay: (choice: LobbyChoice) => void;
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="lobby-option-group">
      <span className="lobby-option-label">{label}</span>
      <div className="lobby-option-btns">
        {options.map(o => (
          <button
            key={o.key}
            className={`lobby-option-btn${value === o.key ? ' active' : ''}`}
            onClick={() => onChange(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Lobby({ onPlay }: LobbyProps) {
  const [board, setBoard] = useState<BoardKey>('3x3');
  const [shifting, setShifting] = useState<ShiftKey>('once');
  const [mode, setMode] = useState<ModeKey>('1p-easy');

  function handlePlay() {
    const config: GameConfig = { ...BOARD_CONFIGS[board], maxOffset: MAX_OFFSETS[shifting] };
    if (mode === '2p') {
      onPlay({ config, mode: '2p' });
    } else if (mode === 'online') {
      onPlay({ config, mode: 'online' });
    } else {
      const difficulty = mode.slice(3) as Difficulty; // '1p-easy' → 'easy'
      onPlay({ config, mode: '1p', difficulty });
    }
  }

  return (
    <div className="pre-lobby">
      <h1 className="title">Shift Tac Toe</h1>
      <div className="lobby-options">
        <OptionGroup
          label="Board"
          options={[
            { key: '3x3', label: 'Tic Tac Toe' },
            { key: '6x7', label: 'Connect Four' },
          ]}
          value={board}
          onChange={setBoard}
        />
        <OptionGroup
          label="Shifting"
          options={[
            { key: 'off',       label: 'Off' },
            { key: 'once',      label: 'Once' },
            { key: 'unlimited', label: 'Unlimited' },
          ]}
          value={shifting}
          onChange={setShifting}
        />
        <OptionGroup
          label="Mode"
          options={[
            { key: '2p',          label: 'Local' },
            { key: '1p-easy',     label: 'Easy' },
            { key: '1p-hard',     label: 'Hard' },
            { key: '1p-impossible', label: 'Impossible' },
            { key: 'online',      label: 'Online' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      <button className="lobby-play-btn" onClick={handlePlay}>
        Play
      </button>
    </div>
  );
}
