import { ConnectionState, TaskState } from './types.js';
import { StateManager } from './state-manager.js';

interface StatusBarItem {
  text: string;
  color: string | undefined;
  show(): void;
  dispose(): void;
}

export class StatusBarController {
  private item: StatusBarItem;
  private stateManager: StateManager;

  constructor(stateManager: StateManager, item: StatusBarItem) {
    this.stateManager = stateManager;
    this.item = item;
    this.update();
    this.item.show();
    stateManager.on('stateChange', () => this.update());
  }

  private update() {
    const conn = this.stateManager.connectionState;
    const task = this.stateManager.taskState;
    const taskId = this.stateManager.currentTaskId;

    let label = `$(plug) Chorus: ${conn}`;
    if (taskId && task !== TaskState.Idle) {
      label += ` | Task #${taskId} (${task})`;
    }
    this.item.text = label;

    switch (conn) {
      case ConnectionState.Connected: this.item.color = 'green'; break;
      case ConnectionState.Connecting: this.item.color = 'yellow'; break;
      case ConnectionState.Error: this.item.color = 'red'; break;
      default: this.item.color = undefined; break;
    }
  }

  dispose() {
    this.item.dispose();
  }
}
