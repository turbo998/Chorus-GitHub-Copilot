import { TaskState, StateEvent } from './types.js';

const validTransitions: Record<TaskState, Partial<Record<string, TaskState>>> = {
  [TaskState.Idle]: { CLAIM_TASK: TaskState.Claimed },
  [TaskState.Claimed]: { START_WORK: TaskState.Working, RESET: TaskState.Idle },
  [TaskState.Working]: { SUBMIT: TaskState.Submitting, RESET: TaskState.Idle },
  [TaskState.Submitting]: { VERIFY: TaskState.Verifying, RESET: TaskState.Idle },
  [TaskState.Verifying]: { COMPLETE_VERIFY: TaskState.Idle, RESET: TaskState.Idle },
};

export function transitionTask(current: TaskState, event: StateEvent): TaskState {
  if (event.type === 'RESET') return TaskState.Idle;
  const next = validTransitions[current]?.[event.type];
  if (next === undefined) {
    throw new Error(`Invalid task transition: ${current} + ${event.type}`);
  }
  return next;
}
