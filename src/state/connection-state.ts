import { ConnectionState, StateEvent } from './types.js';

const validTransitions: Record<ConnectionState, Partial<Record<string, ConnectionState>>> = {
  [ConnectionState.Disconnected]: { CONNECT: ConnectionState.Connecting },
  [ConnectionState.Connecting]: { CONNECTED: ConnectionState.Connected, ERROR: ConnectionState.Error },
  [ConnectionState.Connected]: { DISCONNECT: ConnectionState.Disconnected, ERROR: ConnectionState.Error },
  [ConnectionState.Error]: { CONNECT: ConnectionState.Connecting, DISCONNECT: ConnectionState.Disconnected },
};

export function transitionConnection(current: ConnectionState, event: StateEvent): ConnectionState {
  const next = validTransitions[current]?.[event.type];
  if (next === undefined) {
    throw new Error(`Invalid connection transition: ${current} + ${event.type}`);
  }
  return next;
}
