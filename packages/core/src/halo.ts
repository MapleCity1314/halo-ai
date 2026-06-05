import { HaloAgent } from "./halo-agent.js";
import type {
  HaloAgentOptions,
  AgentEvent,
  ModelConfig,
  SkillMetadata,
} from "./session.js";
import type { ModelAdapter } from "./model-adapter.js";
import type { ContextStrategy, RepairStrategy } from "./strategies.js";
import type { ToolSpec, ChatMessage, ToolDefinition } from "./types.js";
import type { Sandbox } from "./sandbox.js";

export class Halo {
  private _adapter: ModelAdapter;

  constructor(opts: { adapter: ModelAdapter }) {
    this._adapter = opts.adapter;
  }

  agent(opts: {
    /** Prefix messages (preferred). Mutually exclusive with `system`. */
    messages?: ChatMessage[];
    /** @deprecated Use `messages` with `role: "system"` instead. */
    system?: string;
    tools?: ToolSpec[] | Record<string, ToolDefinition<any>>;
    /** @deprecated Use `messages` with `role: "user"` / `role: "assistant"` instead. */
    fewShots?: ChatMessage[];
    /** Agent-level model defaults. Does not enter prefix — safe to change. */
    model?: ModelConfig;
    /** Agent Skills (agentskills.io). Name+description enter system prompt. */
    skills?: SkillMetadata[];
    /** Sandbox for file ops and command execution. Does NOT enter prefix. */
    sandbox?: Sandbox;

    context?: ContextStrategy;
    repair?: RepairStrategy;

    on?: (event: AgentEvent, payload: unknown) => void;
  }): HaloAgent {
    const agentOpts: HaloAgentOptions = {
      adapter: this._adapter,
      messages: opts.messages,
      system: opts.system,
      tools: opts.tools,
      fewShots: opts.fewShots,
      model: opts.model,
      skills: opts.skills,
      sandbox: opts.sandbox,
      context: opts.context,
      repair: opts.repair,
      on: opts.on,
    };

    return new HaloAgent(agentOpts);
  }
}
