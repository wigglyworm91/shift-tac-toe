import { useState, useRef, useEffect, useCallback } from 'react';
import type { Player, Action } from '../types';
import type { ClientMessage, ServerMessage } from './protocol';

export type MpState = 'idle' | 'connecting' | 'waiting' | 'playing' | 'opponent_left' | 'spectating' | 'spectating_ended';
export type RematchState = 'none' | 'offered' | 'received';

export interface UseMultiplayerReturn {
  mpState: MpState;
  shareUrl: string | null;
  myColor: Player | null;
  username: string;
  setUsername: (name: string) => void;
  opponentName: string | null;
  createRoom: () => void;
  sendAction: (action: Action) => void;
  disconnect: () => void;
  lastOpponentAction: Action | null;
  rematchState: RematchState;
  rematchAccepted: number;
  offerRematch: () => void;
  acceptRematch: () => void;
  spectatorNames: { red: string; black: string } | null;
  initialActions: Action[] | null;
  clearInitialActions: () => void;
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
  const [rematchState, setRematchState] = useState<RematchState>('none');
  const [rematchAccepted, setRematchAccepted] = useState(0);
  const [spectatorNames, setSpectatorNames] = useState<{ red: string; black: string } | null>(null);
  const [initialActions, setInitialActions] = useState<Action[] | null>(null);

  const [username, setUsernameState] = useState<string>(
    () => localStorage.getItem('shift-tac-toe-username') ?? ''
  );
  const [opponentName, setOpponentName] = useState<string | null>(null);

  const setUsername = useCallback((name: string) => {
    localStorage.setItem('shift-tac-toe-username', name);
    setUsernameState(name);
  }, []);

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
        console.log('[WS] room created', msg.roomCode);
        const url = makeShareUrl(msg.roomCode);
        setShareUrl(url);
        history.pushState(null, '', `${import.meta.env.BASE_URL as string}game/${msg.roomCode}`);
        setMpState('waiting');

      } else if (msg.type === 'GAME_START') {
        console.log('[WS] game start, playing as', msg.yourColor, 'vs', msg.opponentName);
        setMyColor(msg.yourColor);
        setOpponentName(msg.opponentName);
        setMpState('playing');

      } else if (msg.type === 'PLAYER_ACTION') {
        setLastOpponentAction(msg.action);

      } else if (msg.type === 'SPECTATE_START') {
        console.log('[WS] spectating', msg.redName, '(red) vs', msg.blackName, '(black)');
        setSpectatorNames({ red: msg.redName, black: msg.blackName });
        setInitialActions(msg.actions);
        setMpState('spectating');

      } else if (msg.type === 'PLAYER_LEFT') {
        console.log('[WS] player left:', msg.playerColor);
        setMpState('spectating_ended');

      } else if (msg.type === 'REMATCH_OFFER') {
        // If we already offered, both clicked simultaneously — treat as mutual accept
        setRematchState(prev => {
          if (prev === 'offered') {
            setRematchAccepted(n => n + 1);
            return 'none';
          }
          return 'received';
        });

      } else if (msg.type === 'REMATCH_ACCEPT') {
        setRematchState('none');
        setRematchAccepted(n => n + 1);

      } else if (msg.type === 'OPPONENT_LEFT') {
        console.log('[WS] opponent left');
        setRematchState('none');
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
    console.log('[WS] creating room');
    const name = username || 'Anonymous';
    connect(() => {
      send({ type: 'CREATE_ROOM', username: name });
    });
  }, [connect, send, username]);

  const joinRoom = useCallback((roomCode: string) => {
    console.log('[WS] joining room', roomCode);
    const name = username || 'Anonymous';
    connect(() => {
      send({ type: 'JOIN_ROOM', roomCode, username: name });
    });
  }, [connect, send, username]);

  const sendAction = useCallback((action: Action) => {
    send({ type: 'PLAYER_ACTION', action });
  }, [send]);

  const offerRematch = useCallback(() => {
    setRematchState('offered');
    send({ type: 'REMATCH_OFFER' });
  }, [send]);

  const acceptRematch = useCallback(() => {
    setRematchState('none');
    setRematchAccepted(n => n + 1);
    send({ type: 'REMATCH_ACCEPT' });
  }, [send]);

  const clearInitialActions = useCallback(() => {
    setInitialActions(null);
  }, []);

  const disconnect = useCallback(() => {
    console.log('[WS] disconnecting');
    wsRef.current?.close();
    wsRef.current = null;
    setMpState('idle');
    setShareUrl(null);
    setMyColor(null);
    setOpponentName(null);
    setLastOpponentAction(null);
    setRematchState('none');
    setSpectatorNames(null);
    setInitialActions(null);
    // Navigate back to root
    history.pushState(null, '', import.meta.env.BASE_URL as string);
  }, [send]);

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

  return { mpState, shareUrl, myColor, username, setUsername, opponentName, createRoom, sendAction, disconnect, lastOpponentAction, rematchState, rematchAccepted, offerRematch, acceptRematch, spectatorNames, initialActions, clearInitialActions };
}
