# Shift Tac Toe

A 3x3 Connect-Four variant built with React + TypeScript + Vite.

## Commands

```bash
npm run dev      # start dev server
npm run test     # run Vitest tests
npm run build    # typecheck + build
```

## Game Rules

- 3×3 grid; players drop discs into columns (gravity applies)
- 5 discs per player (limited resource — ejected discs are reclaimed)
- Instead of dropping, a player may shift any row left or right by 1
  - Each row can only be ±1 from its original position
  - Discs shifted off the edge are returned to that player
  - Gravity applies after every action
- Win: 3-in-a-row (row, column, or diagonal); both players can win simultaneously

## Architecture

**State**: `gameReducer` (reducer pattern) holds all authoritative game state. `App.tsx` holds UI-only state (animations, display board frozen during transitions).

**Logic lives in `src/logic/`** — pure functions, no React deps. Keep it that way.

- `gameReducer.ts` — actions: `DROP_DISC`, `SHIFT_ROW`, `RESET_GAME`
- `shift.ts` — row shifting + ejection; returns `gravityDrops` for sound/animation
- `gravity.ts` — `applyGravityAll`, `applyGravityAllTracked` (returns which cells filled)
- `winDetection.ts` — checks 8 lines; exports `LINES` for the AI evaluator
- `validation.ts` — `canDrop`, `canShift`
- `ai.ts` — minimax + alpha-beta pruning at depth 7; `getBestMove(state)`
- `ai.test.ts` — Vitest tests; run with `npm test`

**Constants** (`src/constants.ts`): `ROWS=3`, `COLS=3`, `DISCS_PER_PLAYER=5`, `MAX_OFFSET=1`, `CELL_SIZE=80px`.

**Sounds** (`src/sounds.ts`): fully procedural Web Audio API — no audio files. `playDropSound(col)` pans by column; `playShiftSound(direction)` pans by direction.

## Key Patterns

**Gravity-drop sound trigger**: after a shift animation ends, `App.tsx` reads `latestGravityDropsRef` (set from `gameState.lastGravityDrops` in the reducer) and plays staggered clack sounds. Do not use board diffing — use the authoritative `gravityDrops` from `ShiftResult`.

**AI re-trigger after human shift**: the AI `useEffect` includes `shiftAnimEndKey` in its deps. This is a state counter incremented in `handleShiftTransitionEnd` — necessary because refs don't trigger effects.

**Row animation**: `displayBoard` and `slotOffsets` are frozen at shift start; `transformOffsets` drives the CSS transition. Board snaps to `gameState` after `transitionend`.

**Game modes**: `mode: '1p' | '2p'` in App state. AI always plays black. Board and shift controls are `disabled` during AI turn.

## Deployment

Dockerised with a multi-stage build (Node builds, nginx serves). Deployed at `blahaj.beauty/shift-tac-toe/` behind an Apache reverse proxy.

**Docker**:
```bash
docker compose up --build -d   # build and start
docker compose down             # stop
```

The `BASE_URL` build arg (default `/shift-tac-toe/`) is passed to `vite build --base` so asset paths are correct under the subpath. It is set in `docker-compose.yml`. The host port is controlled by the `PORT` env var (default `5780`).

**Apache config** (`/etc/apache2/sites-available/`): requires `mod_proxy` and `mod_proxy_http` (`a2enmod proxy proxy_http`). ProxyPass forwards `/shift-tac-toe` to `http://localhost:5780/`.

## AI

Minimax with alpha-beta pruning, depth 7. Evaluation scores 8 lines by disc counts (2-in-line = ±100, 1-in-line = ±10, mixed = 0). Terminal scores include depth bonus to prefer faster wins / slower losses. Moves are shuffled before root iteration for non-determinism.
