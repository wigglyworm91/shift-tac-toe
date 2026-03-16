import type { WebSocket } from 'ws';

export interface GameConfig {
  rows: number;
  cols: number;
  winLength: number;
  maxOffset: number;
}

export type Action =
  | { type: 'DROP_DISC'; col: number }
  | { type: 'SHIFT_ROW'; row: number; direction: 'left' | 'right' }
  | { type: 'RESET_GAME'; config?: GameConfig; firstPlayer?: 'red' | 'black' }
  | { type: 'RESIGN'; loser: 'red' | 'black' };

export interface Room {
  code: string;
  redSocket: WebSocket | null;
  blackSocket: WebSocket | null;
  creatorName: string;
  redName: string;
  blackName: string | null;
  spectators: Set<WebSocket>;
  actionLog: Action[];
  rematchOfferedBy: WebSocket | null;
  lastConfig: GameConfig | undefined;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<WebSocket, Room>();

// Separate preview cache for OG tags — persists after the room closes so
// Discord's crawler (which arrives seconds after the link is shared) can still
// read the creator's name even if the game has already started/ended.
const PREVIEW_TTL_MS = 60 * 60 * 1000; // 1 hour
const previews = new Map<string, { creatorName: string; expiresAt: number }>();

export function getPreview(code: string): { creatorName: string } | null {
  const p = previews.get(code);
  if (!p) return null;
  if (Date.now() > p.expiresAt) { previews.delete(code); return null; }
  return { creatorName: p.creatorName };
}

function generateCode(): string {
  // 6-char alphanumeric, uppercase
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function createRoom(socket: WebSocket, creatorName: string): string {
  let code = generateCode();
  // Extremely unlikely collision, but be safe
  while (rooms.has(code)) code = generateCode();

  const room: Room = {
    code,
    redSocket: socket,
    blackSocket: null,
    creatorName,
    redName: creatorName,
    blackName: null,
    spectators: new Set(),
    actionLog: [],
    rematchOfferedBy: null,
    lastConfig: undefined,
  };
  rooms.set(code, room);
  socketToRoom.set(socket, room);

  // Store preview for OG tag generation (survives room closure)
  previews.set(code, { creatorName, expiresAt: Date.now() + PREVIEW_TTL_MS });

  return code;
}

export function getRoom(code: string): Room | null {
  return rooms.get(code) ?? null;
}

export function joinRoom(code: string, socket: WebSocket): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.blackSocket !== null) return null; // already full

  room.blackSocket = socket;
  socketToRoom.set(socket, room);
  return room;
}

export function addSpectator(code: string, socket: WebSocket): void {
  const room = rooms.get(code);
  if (!room) return;
  room.spectators.add(socket);
  socketToRoom.set(socket, room);
}

export function removeSpectator(socket: WebSocket): void {
  const room = socketToRoom.get(socket);
  if (!room) return;
  room.spectators.delete(socket);
  socketToRoom.delete(socket);
}

export function logAction(room: Room, action: Action): void {
  room.actionLog.push(action);
  if (action.type === 'RESET_GAME' && action.config) {
    room.lastConfig = action.config;
  }
}

export function getRoomForSocket(socket: WebSocket): Room | null {
  return socketToRoom.get(socket) ?? null;
}

export function removeRoom(code: string): void {
  const room = rooms.get(code);
  if (!room) return;
  if (room.redSocket) socketToRoom.delete(room.redSocket);
  if (room.blackSocket) socketToRoom.delete(room.blackSocket);
  for (const spec of room.spectators) socketToRoom.delete(spec);
  rooms.delete(code);
}
