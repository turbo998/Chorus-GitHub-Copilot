export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

export enum TaskState {
  Idle = 'idle',
  Claimed = 'claimed',
  Working = 'working',
  Submitting = 'submitting',
  Verifying = 'verifying',
}

export type StateEvent =
  | { type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECT' }
  | { type: 'ERROR'; error: string }
  | { type: 'CLAIM_TASK'; taskId: string }
  | { type: 'START_WORK' }
  | { type: 'SUBMIT' }
  | { type: 'VERIFY' }
  | { type: 'COMPLETE_VERIFY' }
  | { type: 'RESET' };

export type StateListener = (event: StateEvent) => void;
