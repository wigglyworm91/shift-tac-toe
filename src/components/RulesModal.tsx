import { useEffect, useRef } from 'react';

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    // Close when clicking the backdrop (the dialog element itself, not its children)
    if (e.target === ref.current) onClose();
  }

  return (
    <dialog ref={ref} className="rules-dialog" onClose={onClose} onClick={handleClick}>
      <div className="rules-content">
        <h2>How to Play</h2>

        <section>
          <h3>Goal</h3>
          <p>Get 3 of your discs in a row — horizontally, vertically, or diagonally.</p>
        </section>

        <section>
          <h3>On your turn</h3>
          <p>You can do one of two things:</p>
          <ul>
            <li><strong>Drop a disc</strong> into any column. It falls to the lowest empty cell.</li>
            <li><strong>Shift a row</strong> left or right by one cell using the arrow buttons.</li>
          </ul>
        </section>

        <section>
          <h3>Shifting rows</h3>
          <ul>
            <li>Each row can only shift ±1 from its starting position.</li>
            <li>Any disc pushed off the edge is returned to that player's supply.</li>
            <li>Gravity applies after every shift — discs above gaps fall down.</li>
          </ul>
        </section>

        <section>
          <h3>Discs</h3>
          <p>Each player has 5 discs. Ejected discs go back into your supply, so you never run out — but a full column stays full until something is shifted out.</p>
        </section>

        <section>
          <h3>Winning</h3>
          <p>First to 3-in-a-row wins. Both players can win simultaneously — that's a draw.</p>
        </section>

        <button className="rules-close-btn" onClick={onClose}>Got it</button>
      </div>
    </dialog>
  );
}
