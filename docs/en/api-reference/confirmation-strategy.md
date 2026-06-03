# `ConfirmationStrategy`

Optional strategy for requiring human approval before tool execution.

## Interface

```ts
interface ConfirmationStrategy {
  approve(name: string, args: Record<string, unknown>): Promise<boolean>;
}
```

## Usage

```ts
const agent = halo.agent({
  system: "You are a helpful assistant.",
  tools: { delete_file: tool({ ... }) },
  confirmation: {
    approve: async (name, args) => {
      console.log(`Approve tool "${name}" with args:`, args);
      // In a CLI: prompt user
      // In a web app: show a confirmation dialog
      return true;
    },
  },
});
```

::: tip Status
The `ConfirmationStrategy` interface is defined but not yet consumed by `HaloAgentImpl`. It will be integrated in a future version for human-in-the-loop tool approval.
:::
