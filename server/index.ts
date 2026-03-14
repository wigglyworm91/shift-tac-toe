import { WebSocketServer, WebSocket } from 'ws';
import { createRoom, joinRoom, getRoomForSocket, removeRoom } from './rooms.js';
import type { ClientMessage, ServerMessage } from './protocol.js';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

wss.on('listening', () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      send(socket, { type: 'ERROR', reason: 'ROOM_NOT_FOUND' });
      return;
    }

    if (msg.type === 'CREATE_ROOM') {
      const code = createRoom(socket);
      send(socket, { type: 'ROOM_CREATED', roomCode: code });

    } else if (msg.type === 'JOIN_ROOM') {
      const room = joinRoom(msg.roomCode.toUpperCase(), socket);
      if (!room) {
        // Check if the room exists but is full vs. doesn't exist at all
        send(socket, { type: 'ERROR', reason: 'ROOM_NOT_FOUND' });
        return;
      }

      // Randomly assign colors
      const creatorGetsRed = Math.random() < 0.5;
      const creatorColor  = creatorGetsRed ? 'red'   : 'black';
      const joinerColor   = creatorGetsRed ? 'black' : 'red';

      if (room.redSocket) send(room.redSocket,   { type: 'GAME_START', yourColor: creatorColor });
      send(socket,                                 { type: 'GAME_START', yourColor: joinerColor });

    } else if (msg.type === 'PLAYER_ACTION') {
      const room = getRoomForSocket(socket);
      if (!room) return;
      const opponent = socket === room.redSocket ? room.blackSocket : room.redSocket;
      if (opponent) send(opponent, { type: 'PLAYER_ACTION', action: msg.action });
    }
  });

  socket.on('close', () => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const opponent = socket === room.redSocket ? room.blackSocket : room.redSocket;
    if (opponent) send(opponent, { type: 'OPPONENT_LEFT' });
    removeRoom(room.code);
  });
});

function send(socket: WebSocket, msg: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}
