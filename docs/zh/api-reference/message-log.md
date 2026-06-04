# `MessageLog`

内存消息历史记录，具有环形缓冲区语义。

## 导入

```ts
import { MessageLog } from "@halo-ai/core";
```

## 构造函数

```ts
new MessageLog(opts?: { storageLimit?: number }) // 默认: 10_000
```

## 属性

| 属性 | 类型 | 描述 |
|---|---|---|
| `length` | `number` | 当前消息数量 |
| `version` | `number` | 单调递增计数器，`append()` 和 `hydrate()` 时递增 |

## 方法

| 方法 | 描述 |
|---|---|
| `append(msg)` | 添加消息。超出 `storageLimit` 时丢弃最早的消息 |
| `hydrate(messages)` | 替换所有条目。用于恢复外部状态 |
| `toFullHistory()` | 所有消息的浅拷贝 |
| `recent(n)` | 最后 N 条消息的浅拷贝 |
