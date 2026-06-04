# `ConfirmationStrategy`

可选策略，在工具执行前需要人工批准。

## 接口

```ts
interface ConfirmationStrategy {
  approve(name: string, args: Record<string, unknown>): Promise<boolean>;
}
```

## 使用

```ts
const agent = halo.agent({
  system: "You are a helpful assistant.",
  tools: { delete_file: tool({ ... }) },
  confirmation: {
    approve: async (name, args) => {
      console.log(`批准工具 "${name}" 参数:`, args);
      // 在 CLI 中：提示用户
      // 在 Web 应用中：显示确认对话框
      return true;
    },
  },
});
```

::: tip 状态说明
`ConfirmationStrategy` 接口已定义但尚未被 `HaloAgentImpl` 消费。它将在未来版本中集成，用于人机协同（human-in-the-loop）的工具审批。
:::
