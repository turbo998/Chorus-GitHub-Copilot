import { EventEmitter } from 'events';
import { ConnectionState, TaskState, StateEvent } from './types.js';
import { transitionConnection } from './connection-state.js';
import { transitionTask } from './task-state.js';

export interface Memento {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Thenable<void>;
}

export class StateManager extends EventEmitter {
  private _connectionState: ConnectionState = ConnectionState.Disconnected;
  private _taskState: TaskState = TaskState.Idle;
  private _currentTaskId: string | undefined;
  private _lastError: string | undefined;
  private _reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private _reconnectAttempts = 0;
  private _maxReconnectAttempts = 10;
  private _disposed = false;

  get connectionState() { return this._connectionState; }
  get taskState() { return this._taskState; }
  get currentTaskId() { return this._currentTaskId; }
  get lastError() { return this._lastError; }

  private applyConnectionEvent(event: StateEvent) {
    this._connectionState = transitionConnection(this._connectionState, event);
    this.emit('stateChange', event);
  }

  private applyTaskEvent(event: StateEvent) {
    this._taskState = transitionTask(this._taskState, event);
    this.emit('stateChange', event);
  }

  connect() {
    this.cancelReconnect();
    this._reconnectAttempts = 0;
    this.applyConnectionEvent({ type: 'CONNECT' });
  }

  disconnect() {
    this.cancelReconnect();
    this.applyConnectionEvent({ type: 'DISCONNECT' });
  }

  onConnected() {
    this.cancelReconnect();
    this._reconnectAttempts = 0;
    this.applyConnectionEvent({ type: 'CONNECTED' });
  }

  onError(err: string) {
    this._lastError = err;
    const event: StateEvent = { type: 'ERROR', error: err };
    this.applyConnectionEvent(event);
    this.scheduleReconnect();
  }

  claimTask(id: string) {
    this._currentTaskId = id;
    this.applyTaskEvent({ type: 'CLAIM_TASK', taskId: id });
  }

  startWork() { this.applyTaskEvent({ type: 'START_WORK' }); }
  submit() { this.applyTaskEvent({ type: 'SUBMIT' }); }
  verify() { this.applyTaskEvent({ type: 'VERIFY' }); }
  completeVerify() { this.applyTaskEvent({ type: 'COMPLETE_VERIFY' }); this._currentTaskId = undefined; }
  resetTask() { this.applyTaskEvent({ type: 'RESET' }); this._currentTaskId = undefined; }

  private scheduleReconnect() {
    if (this._disposed || this._reconnectAttempts >= this._maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), 60000);
    this._reconnectAttempts++;
    this._reconnectTimer = setTimeout(() => {
      if (!this._disposed) {
        try {
          this.cancelReconnect();
          this.applyConnectionEvent({ type: 'CONNECT' });
        } catch { /* ignore */ }
      }
    }, delay);
  }

  cancelReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = undefined;
    }
  }

  async persist(memento: Memento) {
    await memento.update('chorus.connectionState', this._connectionState);
    await memento.update('chorus.taskState', this._taskState);
    await memento.update('chorus.currentTaskId', this._currentTaskId);
  }

  restore(memento: Memento) {
    this._connectionState = memento.get('chorus.connectionState', ConnectionState.Disconnected);
    this._taskState = memento.get('chorus.taskState', TaskState.Idle);
    this._currentTaskId = memento.get('chorus.currentTaskId', undefined as string | undefined);
  }

  dispose() {
    this._disposed = true;
    this.cancelReconnect();
    this.removeAllListeners();
  }
}
