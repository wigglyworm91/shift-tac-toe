import type { WebSocket } from 'ws';

export interface Room {
  code: string;
  redSocket: WebSocket | null;
  blackSocket: WebSocket | null;
}

const rooms = new Map<string, Room>();

// Reverse index so we can find a room given just a socket
const socketToRoom = new Map<WebSocket, Room>();

function generateCode(): string {
  // 6-char alphanumeric, uppercase
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function createRoom(socket: WebSocket): string {
  let code = generateCode();
  // Extremely unlikely collision, but be safe
  while (rooms.has(code)) code = generateCode();

  const room: Room = { code, redSocket: socket, blackSocket: null };
  rooms.set(code, room);
  socketToRoom.set(socket, room);
  return code;
}

export function joinRoom(code: string, socket: WebSocket): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.blackSocket !== null) return null; // already full

  room.blackSocket = socket;
  socketToRoom.set(socket, room);
  return room;
}

export function getRoomForSocket(socket: WebSocket): Room | null {
  return socketToRoom.get(socket) ?? null;
}

export function removeRoom(code: string): void {
  const room = rooms.get(code);
  if (!room) return;
  if (room.redSocket) socketToRoom.delete(room.redSocket);
  if (room.blackSocket) socketToRoom.delete(room.blackSocket);
  rooms.delete(code);
}
