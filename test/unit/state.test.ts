import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionState, TaskState } from '../../src/state/types';
import { transitionConnection } from '../../src/state/connection-state';
import { transitionTask } from '../../src/state/task-state';
import { StateManager } from '../../src/state/state-manager';
import { StatusBarController } from '../../src/state/status-bar';

describe('ConnectionState transitions', () => {
  it('disconnected → connecting', () => {
    expect(transitionConnection(ConnectionState.Disconnected, { type: 'CONNECT' })).toBe(ConnectionState.Connecting);
  });
  it('connecting → connected', () => {
    expect(transitionConnection(ConnectionState.Connecting, { type: 'CONNECTED' })).toBe(ConnectionState.Connected);
  });
  it('connecting → error', () => {
    expect(transitionConnection(ConnectionState.Connecting, { type: 'ERROR', error: 'fail' })).toBe(ConnectionState.Error);
  });
  it('connected → disconnected', () => {
    expect(transitionConnection(ConnectionState.Connected, { type: 'DISCONNECT' })).toBe(ConnectionState.Disconnected);
  });
  it('connected → error', () => {
    expect(transitionConnection(ConnectionState.Connected, { type: 'ERROR', error: 'fail' })).toBe(ConnectionState.Error);
  });
  it('error → connecting', () => {
    expect(transitionConnection(ConnectionState.Error, { type: 'CONNECT' })).toBe(ConnectionState.Connecting);
  });
  it('error → disconnected', () => {
    expect(transitionConnection(ConnectionState.Error, { type: 'DISCONNECT' })).toBe(ConnectionState.Disconnected);
  });
  it('invalid transition throws', () => {
    expect(() => transitionConnection(ConnectionState.Disconnected, { type: 'CONNECTED' })).toThrow();
    expect(() => transitionConnection(ConnectionState.Connected, { type: 'CONNECT' })).toThrow();
  });
});

describe('TaskState transitions', () => {
  it('full lifecycle', () => {
    let s = TaskState.Idle;
    s = transitionTask(s, { type: 'CLAIM_TASK', taskId: '1' });
    expect(s).toBe(TaskState.Claimed);
    s = transitionTask(s, { type: 'START_WORK' });
    expect(s).toBe(TaskState.Working);
    s = transitionTask(s, { type: 'SUBMIT' });
    expect(s).toBe(TaskState.Submitting);
    s = transitionTask(s, { type: 'VERIFY' });
    expect(s).toBe(TaskState.Verifying);
    s = transitionTask(s, { type: 'COMPLETE_VERIFY' });
    expect(s).toBe(TaskState.Idle);
  });

  it('reset from any state', () => {
    expect(transitionTask(TaskState.Claimed, { type: 'RESET' })).toBe(TaskState.Idle);
    expect(transitionTask(TaskState.Working, { type: 'RESET' })).toBe(TaskState.Idle);
    expect(transitionTask(TaskState.Submitting, { type: 'RESET' })).toBe(TaskState.Idle);
    expect(transitionTask(TaskState.Verifying, { type: 'RESET' })).toBe(TaskState.Idle);
    expect(transitionTask(TaskState.Idle, { type: 'RESET' })).toBe(TaskState.Idle);
  });

  it('invalid transition throws', () => {
    expect(() => transitionTask(TaskState.Idle, { type: 'START_WORK' })).toThrow();
    expect(() => transitionTask(TaskState.Claimed, { type: 'SUBMIT' })).toThrow();
  });
});

describe('StateManager', () => {
  let sm: StateManager;
  beforeEach(() => { sm = new StateManager(); });

  it('emits stateChange on transitions', () => {
    const fn = vi.fn();
    sm.on('stateChange', fn);
    sm.connect();
    expect(fn).toHaveBeenCalledWith({ type: 'CONNECT' });
    sm.onConnected();
    expect(fn).toHaveBeenCalledWith({ type: 'CONNECTED' });
    expect(sm.connectionState).toBe(ConnectionState.Connected);
  });

  it('persist/restore round-trip', async () => {
    const store = new Map<string, unknown>();
    const memento = {
      get<T>(key: string, defaultValue: T): T { return (store.has(key) ? store.get(key) : defaultValue) as T; },
      update(key: string, value: unknown) { store.set(key, value); return Promise.resolve(); },
    };
    sm.connect();
    sm.onConnected();
    sm.claimTask('42');
    sm.startWork();
    await sm.persist(memento);

    const sm2 = new StateManager();
    sm2.restore(memento);
    expect(sm2.connectionState).toBe(ConnectionState.Connected);
    expect(sm2.taskState).toBe(TaskState.Working);
    expect(sm2.currentTaskId).toBe('42');
  });

  it('auto-reconnect with exponential backoff', () => {
    vi.useFakeTimers();
    sm.connect();
    sm.onError('fail');
    expect(sm.connectionState).toBe(ConnectionState.Error);

    // After 1s, should reconnect (attempt 1)
    vi.advanceTimersByTime(1000);
    expect(sm.connectionState).toBe(ConnectionState.Connecting);

    // Simulate another error
    sm.onError('fail2');
    // Next delay is 2s
    vi.advanceTimersByTime(1999);
    expect(sm.connectionState).toBe(ConnectionState.Error);
    vi.advanceTimersByTime(1);
    expect(sm.connectionState).toBe(ConnectionState.Connecting);

    vi.useRealTimers();
  });
});

describe('StatusBarController', () => {
  it('updates label and color on state changes', () => {
    const item = { text: '', color: undefined as string | undefined, show: vi.fn(), dispose: vi.fn() };
    const sm = new StateManager();
    new StatusBarController(sm, item);

    expect(item.text).toBe('$(plug) Chorus: disconnected');
    expect(item.color).toBeUndefined();

    sm.connect();
    expect(item.text).toBe('$(plug) Chorus: connecting');
    expect(item.color).toBe('yellow');

    sm.onConnected();
    expect(item.text).toBe('$(plug) Chorus: connected');
    expect(item.color).toBe('green');

    sm.claimTask('7');
    expect(item.text).toBe('$(plug) Chorus: connected | Task #7 (claimed)');
    expect(item.color).toBe('green');

    sm.onError('x');
    expect(item.text).toContain('error');
    expect(item.color).toBe('red');
  });
});
