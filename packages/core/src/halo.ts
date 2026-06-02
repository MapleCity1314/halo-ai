import { HaloSession } from "./halo-session.js";
import type { HaloSessionOptions, SessionEvent } from "./session.js";
import type { ModelAdapter } from "./model-adapter.js";
import type { ContextStrategy, RepairStrategy, ConfirmationStrategy } from "./strategies.js";

export class Halo {
  private _adapter: ModelAdapter;

  constructor(opts: { adapter: ModelAdapter }) {
    this._adapter = opts.adapter;
  }

  session(opts: {
    system: string;
    tools?: import("./types.js").ToolSpec[];
    fewShots?: import("./types.js").ChatMessage[];

    context?: "truncate" | "summarize" | ContextStrategy;
    repair?: "basic" | "full" | RepairStrategy;
    confirmation?: "confirm" | ConfirmationStrategy;

    contextOptions?: { maxTokens?: number };
    repairOptions?: { stormThreshold?: number; stormWindow?: number };

    on?: (event: SessionEvent, payload: unknown) => void;
  }): HaloSession {
    const sessionOpts: HaloSessionOptions = {
      adapter: this._adapter,
      system: opts.system,
      tools: opts.tools,
      fewShots: opts.fewShots,
      on: opts.on,
    };

    return new HaloSession(sessionOpts);
  }
}
