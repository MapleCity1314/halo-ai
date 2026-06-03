# `Halo`

Factory class for creating HaloAgent instances. Holds a shared ModelAdapter.

## Import

```ts
import { Halo } from "@halo-ai/core";
```

## Constructor

```ts
new Halo(opts: { adapter: ModelAdapter })
```

| Parameter | Type | Description |
|---|---|---|
| `adapter` | `ModelAdapter` | The model adapter to use for all agents created by this factory |

## Methods

### `agent(opts)`

Creates a new `HaloAgent`.

```ts
halo.agent(opts: {
  system: string;
  tools?: ToolSpec[] | Record<string, ToolDefinition<any>>;
  fewShots?: ChatMessage[];
  context?: ContextStrategy;
  repair?: RepairStrategy;
  confirmation?: ConfirmationStrategy;
  on?: (event: AgentEvent, payload: unknown) => void;
}): HaloAgent
```

| Parameter | Type | Description |
|---|---|---|
| `system` | `string` | **Required.** System prompt that defines the agent's behavior |
| `tools` | `ToolSpec[] \| Record<string, ToolDefinition>` | Optional tools. When `ToolDefinition` includes `execute`, `run()` auto-executes them |
| `fewShots` | `ChatMessage[]` | Optional few-shot examples |
| `context` | `ContextStrategy` | Optional context management strategy |
| `repair` | `RepairStrategy` | Optional tool-call repair strategy |
| `confirmation` | `ConfirmationStrategy` | Optional tool confirmation strategy |
| `on` | `(event, payload) => void` | Optional event listener |

## Examples

### Basic

```ts
const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({
  system: "You are a helpful assistant.",
});
```

### With Tools and Strategies

```ts
const agent = halo.agent({
  system: "You are a research assistant.",
  tools: {
    search: tool({
      description: "Search the web",
      parameters: { ... },
      execute: async ({ query }) => { ... },
    }),
  },
  context: new TruncateStrategy({ maxTokens: 100_000 }),
  repair: new BasicRepair(),
  on: (event, payload) => console.log(event, payload),
});
```

### Multiple Agents Sharing an Adapter

```ts
const halo = new Halo({ adapter: new DeepSeekAdapter({ apiKey }) });

const coder = halo.agent({
  system: "You are a software engineer.",
  tools: { read_file: tool({ ... }), write_code: tool({ ... }) },
});

const reviewer = halo.agent({
  system: "You are a code reviewer. Be thorough and constructive.",
});
```
