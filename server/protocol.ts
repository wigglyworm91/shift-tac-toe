// Mirror of src/multiplayer/protocol.ts — keep in sync.
// The server can't import from src/ so we duplicate the types here.

export type Player = 'red' | 'black';

export type Action =
  | { type: 'DROP_DISC'; col: number }
  | { type: 'SHIFT_ROW'; row: number; direction: 'left' | 'right' }
  | { type: 'RESET_GAME' };

// ── Client → Server ──────────────────────────────────────────────────────────

export interface CreateRoomMsg {
  type: 'CREATE_ROOM';
}

export interface JoinRoomMsg {
  type: 'JOIN_ROOM';
  roomCode: string;
}

export interface PlayerActionMsg {
  type: 'PLAYER_ACTION';
  action: Action;
}

export type ClientMessage = CreateRoomMsg | JoinRoomMsg | PlayerActionMsg;

// ── Server → Client ──────────────────────────────────────────────────────────

export interface RoomCreatedMsg {
  type: 'ROOM_CREATED';
  roomCode: string;
}

export interface GameStartMsg {
  type: 'GAME_START';
  yourColor: Player;
}

export interface PlayerActionRelayMsg {
  type: 'PLAYER_ACTION';
  action: Action;
}

export interface ErrorMsg {
  type: 'ERROR';
  reason: 'ROOM_NOT_FOUND' | 'ROOM_FULL';
}

export interface OpponentLeftMsg {
  type: 'OPPONENT_LEFT';
}

export type ServerMessage =
  | RoomCreatedMsg
  | GameStartMsg
  | PlayerActionRelayMsg
  | ErrorMsg
  | OpponentLeftMsg;
