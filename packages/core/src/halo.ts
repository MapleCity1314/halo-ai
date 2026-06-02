import { HaloAgent } from "./halo-agent.js";
import type { HaloAgentOptions, AgentEvent } from "./session.js";
import type { ModelAdapter } from "./model-adapter.js";
import type { ContextStrategy, RepairStrategy, ConfirmationStrategy } from "./strategies.js";
import type { ToolSpec, ChatMessage, ToolDefinition } from "./types.js";

export class Halo {
  private _adapter: ModelAdapter;

  constructor(opts: { adapter: ModelAdapter }) {
    this._adapter = opts.adapter;
  }

  agent(opts: {
    system: string;
    tools?: ToolSpec[] | Record<string, ToolDefinition>;
    fewShots?: ChatMessage[];

    context?: ContextStrategy;
    repair?: RepairStrategy;
    confirmation?: ConfirmationStrategy;

    on?: (event: AgentEvent, payload: unknown) => void;
  }): HaloAgent {
    const agentOpts: HaloAgentOptions = {
      adapter: this._adapter,
      system: opts.system,
      tools: opts.tools,
      fewShots: opts.fewShots,
      context: opts.context,
      repair: opts.repair,
      confirmation: opts.confirmation,
      on: opts.on,
    };

    return new HaloAgent(agentOpts);
  }
}
