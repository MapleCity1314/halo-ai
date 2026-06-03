# DeepSeekAdapter

DeepSeek API 的内置适配器。支持前缀缓存、工具调用和流式输出。

## 构造函数

```ts
new DeepSeekAdapter(opts: {
  apiKey: string;
  model?: string;       // 默认: "deepseek-v4-flash"
  baseUrl?: string;     // 默认: "https://api.deepseek.com"
})
```

## 属性

| 属性 | 值 | 描述 |
|---|---|---|
| `modelId` | `"deepseek-v4-flash"` | 默认模型 |
| `contextWindow` | `128_000` | Token 限制 |
| `capabilities.toolUse` | `true` | 支持工具调用 |
| `capabilities.streaming` | `true` | 支持流式输出 |
| `pricing.inputPricePer1k` | `0.00027` | 输入价格 |
| `pricing.cachedInputPricePer1k` | `0.00007` | 缓存输入价格 |

## 缓存

DeepSeek 自动缓存位置 0 的前缀。适配器以 `[...prefix, ...history]` 发送消息，将稳定前缀放在首位以实现自动缓存检测。
