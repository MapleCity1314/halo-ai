# 迁移指南

如何在 Halo 版本之间升级。

## v0.x → v0.y（未来）

此页面将记录 Halo 版本间的破坏性变更和迁移步骤。

当前版本（v0.1.x）为预稳定版。次要版本间可能发生破坏性变更。每次变更都将在此记录，并提供分步迁移说明。

---

## 保持更新

关注 [GitHub 仓库](https://github.com/MapleCity1314/halo-ai) 获取发布说明和变更日志。

每个版本通过 Changesets 发布，语义化版本：

- **major** — 破坏性变更，需要代码更新
- **minor** — 新功能，向后兼容
- **patch** — Bug 修复和文档更新

---

## 当前版本

检查安装的版本：

```bash
pnpm list @halo-ai/core
```

或通过代码获取（可用时）：

```ts
import { VERSION } from "@halo-ai/core";
console.log(VERSION);
```
