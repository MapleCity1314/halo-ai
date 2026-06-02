import type { ChatMessage } from "./types.js";

export class MessageLog {
  private _entries: ChatMessage[] = [];
  private _storageLimit: number;
  private _version = 0;

  constructor(opts?: { storageLimit?: number }) {
    this._storageLimit = opts?.storageLimit ?? 10_000;
  }

  /** Append a message. Bumps version. */
  append(msg: ChatMessage): void {
    if (!msg || typeof msg !== "object" || !("role" in msg)) {
      throw new Error(`invalid log entry: ${JSON.stringify(msg)}`);
    }
    this._entries.push(msg);
    if (this._entries.length > this._storageLimit) {
      this._entries.shift();
    }
    this._version++;
  }

  /** Returns a shallow copy of the full history. */
  toFullHistory(): ChatMessage[] {
    return this._entries.map((e) => ({ ...e }));
  }

  /** Returns a copy of the most recent N entries. */
  recent(n: number): ChatMessage[] {
    return this._entries.slice(-n).map((e) => ({ ...e }));
  }

  /** Number of messages currently held. */
  get length(): number {
    return this._entries.length;
  }

  /** Monotonic version. Consumers compare against their own snapshot. */
  get version(): number {
    return this._version;
  }
}
