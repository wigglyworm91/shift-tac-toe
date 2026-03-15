import type { GameConfig } from '../types';
import type { Difficulty } from '../logic/ai';

export type BoardKey = '3x3' | '6x7' | 'custom';
export type ShiftKey = 'off' | 'once' | 'unlimited';
export type ModeKey = '2p' | '1p-easy' | '1p-hard' | '1p-impossible' | 'online';

export const BOARD_CONFIGS: Record<Exclude<BoardKey, 'custom'>, Omit<GameConfig, 'maxOffset'>> = {
  '3x3': { rows: 3, cols: 3, winLength: 3 },
  '6x7': { rows: 6, cols: 7, winLength: 4 },
};

export const MAX_OFFSETS: Record<ShiftKey, number> = {
  off:       0,
  once:      1,
  unlimited: 1000,
};

export type LobbyChoice =
  | { config: GameConfig; mode: '2p' }
  | { config: GameConfig; mode: '1p'; difficulty: Difficulty }
  | { config: GameConfig; mode: 'online' };

export interface LobbySelections {
  board: BoardKey;
  shifting: ShiftKey;
  mode: ModeKey;
  customRows: number;
  customCols: number;
  customWinLength: number;
}

export function lobbyChoiceFromSelections(s: LobbySelections): LobbyChoice {
  const base = s.board === 'custom'
    ? { rows: s.customRows, cols: s.customCols, winLength: s.customWinLength }
    : BOARD_CONFIGS[s.board];
  const config: GameConfig = { ...base, maxOffset: MAX_OFFSETS[s.shifting] };
  if (s.mode === '2p') return { config, mode: '2p' };
  if (s.mode === 'online') return { config, mode: 'online' };
  return { config, mode: '1p', difficulty: s.mode.slice(3) as Difficulty };
}

interface LobbyProps {
  selections: LobbySelections;
  onChange: (s: LobbySelections) => void;
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

function NumInput({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="custom-field">
      <span className="custom-field-label">{label}</span>
      <div className="custom-field-stepper">
        <input
          className="custom-field-input"
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => {
            const v = Math.max(min, Math.min(max, parseInt(e.target.value) || min));
            onChange(v);
          }}
        />
        <div className="custom-field-arrows">
          <button className="custom-arrow-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>▲</button>
          <button className="custom-arrow-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>▼</button>
        </div>
      </div>
    </div>
  );
}

export function Lobby({ selections, onChange, onPlay }: LobbyProps) {
  const { board, shifting, mode, customRows, customCols, customWinLength } = selections;
  const maxWin = Math.max(2, Math.min(customRows, customCols));

  return (
    <div className="pre-lobby">
      <h1 className="title">Shift Tac Toe</h1>
      <div className="lobby-options">
        <OptionGroup
          label="Board"
          options={[
            { key: '3x3',    label: 'Tic Tac Toe' },
            { key: '6x7',    label: 'Connect Four' },
            { key: 'custom', label: 'Custom' },
          ]}
          value={board}
          onChange={b => onChange({ ...selections, board: b })}
        />
        <div className={`custom-fields${board === 'custom' ? ' open' : ''}`}>
          <NumInput label="Rows"     value={customRows}      min={2} max={20}     onChange={v => onChange({ ...selections, customRows: v,      customWinLength: Math.min(customWinLength, Math.min(v, customCols)) })} />
          <NumInput label="Columns"  value={customCols}      min={2} max={20}     onChange={v => onChange({ ...selections, customCols: v,      customWinLength: Math.min(customWinLength, Math.min(customRows, v)) })} />
          <NumInput label="In a row" value={customWinLength} min={2} max={maxWin} onChange={v => onChange({ ...selections, customWinLength: v })} />
        </div>
        <OptionGroup
          label="Shifting"
          options={[
            { key: 'off',       label: 'Off' },
            { key: 'once',      label: 'Once' },
            { key: 'unlimited', label: 'Unlimited' },
          ]}
          value={shifting}
          onChange={s => onChange({ ...selections, shifting: s })}
        />
        <OptionGroup
          label="Mode"
          options={[
            { key: '2p',            label: 'Local' },
            { key: '1p-easy',       label: 'Easy' },
            { key: '1p-hard',       label: 'Hard' },
            { key: '1p-impossible', label: 'Impossible' },
            { key: 'online',        label: 'Online' },
          ]}
          value={mode}
          onChange={m => onChange({ ...selections, mode: m })}
        />
      </div>
      <button className="lobby-play-btn" onClick={() => onPlay(lobbyChoiceFromSelections(selections))}>
        Play
      </button>
    </div>
  );
}
