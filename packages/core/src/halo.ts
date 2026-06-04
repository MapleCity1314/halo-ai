import { HaloAgent } from "./halo-agent.js";
import type {
  HaloAgentOptions,
  AgentEvent,
  ModelConfig,
  StreamTextOptions,
  StreamTextResult,
} from "./session.js";
import type { ModelAdapter } from "./model-adapter.js";
import type { ContextStrategy, RepairStrategy } from "./strategies.js";
import type { ToolSpec, ChatMessage, ToolDefinition } from "./types.js";

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
      context: opts.context,
      repair: opts.repair,
      on: opts.on,
    };

    return new HaloAgent(agentOpts);
  }

  /**
   * Convenience: create an agent and stream the response in one call.
   *
   * `userMessages` is the conversation from the client (AI SDK useChat format).
   * The last message is the current input; prior messages hydrate the agent's history.
   */
  streamAgent(opts: {
    messages?: ChatMessage[];
    system?: string;
    tools?: ToolSpec[] | Record<string, ToolDefinition<any>>;
    fewShots?: ChatMessage[];
    model?: ModelConfig;
    userMessages: ChatMessage[];
    skills?: unknown[];
  } & StreamTextOptions): StreamTextResult {
    const { userMessages, skills: _skills, ...agentOpts } = opts;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent = new HaloAgent(agentOpts as any);
    return agent.streamText(userMessages, opts);
  }
}
