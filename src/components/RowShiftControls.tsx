interface RowShiftControlsProps {
  row: number;
  canShiftLeft: boolean;
  canShiftRight: boolean;
  onShiftLeft: () => void;
  onShiftRight: () => void;
  side: 'left' | 'right';
}

export function RowShiftControls({
  canShiftLeft,
  canShiftRight,
  onShiftLeft,
  onShiftRight,
  side,
}: RowShiftControlsProps) {
  if (side === 'left') {
    return (
      <button
        className={`shift-btn ${canShiftLeft ? '' : 'disabled'}`}
        onClick={onShiftLeft}
        disabled={!canShiftLeft}
        aria-label="Shift row left"
      >
        ◀
      </button>
    );
  }
  return (
    <button
      className={`shift-btn ${canShiftRight ? '' : 'disabled'}`}
      onClick={onShiftRight}
      disabled={!canShiftRight}
      aria-label="Shift row right"
    >
      ▶
    </button>
  );
}
