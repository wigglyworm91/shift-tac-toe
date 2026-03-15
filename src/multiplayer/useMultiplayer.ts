import { useState, useRef, useEffect, useCallback } from 'react';
import type { Player, Action } from '../types';
import type { ClientMessage, ServerMessage } from './protocol';

export type MpState = 'idle' | 'connecting' | 'waiting' | 'playing' | 'opponent_left';

export interface UseMultiplayerReturn {
  mpState: MpState;
  shareUrl: string | null;
  myColor: Player | null;
  createRoom: () => void;
  sendAction: (action: Action) => void;
  disconnect: () => void;
  lastOpponentAction: Action | null;
}

function getRoomCodeFromUrl(): string | null {
  const base = import.meta.env.BASE_URL as string;
  // Strip trailing slash from base so slice works cleanly
  const basePath = base.endsWith('/') ? base.slice(0, -1) : base;
  const path = window.location.pathname.slice(basePath.length);
  return path.match(/^\/game\/([A-Z0-9]{6})$/i)?.[1]?.toUpperCase() ?? null;
}

function makeShareUrl(roomCode: string): string {
  const base = import.meta.env.BASE_URL as string;
  const origin = window.location.origin;
  return `${origin}${base}game/${roomCode}`;
}

export function useMultiplayer(): UseMultiplayerReturn {
  const [mpState, setMpState] = useState<MpState>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<Player | null>(null);
  const [lastOpponentAction, setLastOpponentAction] = useState<Action | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback((onOpen: () => void) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setMpState('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base = import.meta.env.BASE_URL as string;
    const ws = new WebSocket(`${protocol}//${window.location.host}${base}ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      onOpen();
    };

    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        return;
      }

      if (msg.type === 'ROOM_CREATED') {
        const url = makeShareUrl(msg.roomCode);
        setShareUrl(url);
        history.pushState(null, '', `${import.meta.env.BASE_URL as string}game/${msg.roomCode}`);
        setMpState('waiting');

      } else if (msg.type === 'GAME_START') {
        setMyColor(msg.yourColor);
        setMpState('playing');

      } else if (msg.type === 'PLAYER_ACTION') {
        setLastOpponentAction(msg.action);

      } else if (msg.type === 'OPPONENT_LEFT') {
        setMpState('opponent_left');

      } else if (msg.type === 'ERROR') {
        // Bubble up as idle so the lobby can show an error
        setMpState('idle');
        // Re-expose the reason via a custom event for the lobby to read
        window.dispatchEvent(new CustomEvent('mp-error', { detail: msg.reason }));
      }
    };

    ws.onclose = () => {
      // Only reset if we didn't intentionally disconnect
      setMpState((prev) => (prev === 'playing' || prev === 'waiting' ? 'opponent_left' : 'idle'));
    };
  }, []);

  const createRoom = useCallback(() => {
    connect(() => {
      send({ type: 'CREATE_ROOM' });
    });
  }, [connect, send]);

  const joinRoom = useCallback((roomCode: string) => {
    connect(() => {
      send({ type: 'JOIN_ROOM', roomCode });
    });
  }, [connect, send]);

  const sendAction = useCallback((action: Action) => {
    send({ type: 'PLAYER_ACTION', action });
  }, [send]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setMpState('idle');
    setShareUrl(null);
    setMyColor(null);
    setLastOpponentAction(null);
    // Navigate back to root
    history.pushState(null, '', import.meta.env.BASE_URL as string);
  }, []);

  // On mount: if URL contains a room code, auto-join
  useEffect(() => {
    const code = getRoomCodeFromUrl();
    if (code) {
      joinRoom(code);
    }

    // Browser back button: reset to idle
    const onPopState = () => {
      disconnect();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { mpState, shareUrl, myColor, createRoom, sendAction, disconnect, lastOpponentAction };
}
