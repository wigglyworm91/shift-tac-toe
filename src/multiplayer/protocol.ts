import type { Player, Action } from '../types';

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

/** Sent to the creator — room is open, waiting for an opponent */
export interface RoomCreatedMsg {
  type: 'ROOM_CREATED';
  roomCode: string;
}

/** Sent to BOTH players when the joiner arrives; contains their randomly assigned color */
export interface GameStartMsg {
  type: 'GAME_START';
  yourColor: Player;
}

/** Relay an opponent's action to the other player */
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
