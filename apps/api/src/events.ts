import { EventEmitter } from "node:events";

export interface TaskEvent {
  type: "task.created" | "task.updated" | "task.deleted" | "task.archived";
  id: string;
}

class TaskEventBus extends EventEmitter {
  publish(event: TaskEvent): void {
    this.emit("task", event);
  }
  subscribe(listener: (event: TaskEvent) => void): () => void {
    this.on("task", listener);
    return () => this.off("task", listener);
  }
}

export const taskEvents = new TaskEventBus();
taskEvents.setMaxListeners(1000);
