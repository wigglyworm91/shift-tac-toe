interface ColumnDropTargetProps {
  col: number;
  disabled: boolean;
  onDrop: () => void;
}

export function ColumnDropTarget({ disabled, onDrop }: ColumnDropTargetProps) {
  return (
    <button
      className={`drop-target ${disabled ? 'disabled' : ''}`}
      onClick={onDrop}
      disabled={disabled}
      aria-label="Drop disc"
    >
      ▼
    </button>
  );
}
