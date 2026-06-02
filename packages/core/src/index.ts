export type { ChatMessage, ToolCall, ToolDefinition, ToolSpec, Role, Usage } from "./types.js";
export type { ModelAdapter, ModelCapabilities, PricingInfo } from "./model-adapter.js";
export type {
  ContextStrategy,
  RepairStrategy,
  RepairResult,
  ConfirmationStrategy,
} from "./strategies.js";
export type {
  TurnResult,
  TurnChunk,
  ToolResult,
  AgentEvent,
  CacheMissReason,
  SessionStats,
  PricingSnapshot,
  HaloAgentOptions,
} from "./session.js";

export { StablePrefix } from "./prefix.js";
export { MessageLog } from "./log.js";
export { HaloAgent } from "./halo-agent.js";
export { Halo } from "./halo.js";
export { tool } from "./tool.js";
export { HaloAgentImpl } from "./session-impl.js";
