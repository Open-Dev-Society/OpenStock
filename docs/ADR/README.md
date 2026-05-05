# Architecture Decision Records

本目錄存放 OpenStock 的**架構決策紀錄（Architecture Decision Records, ADR）**，用來保留「**為什麼**這樣做」的歷史脈絡。

## 什麼時候要寫 ADR

當決策符合下列任一條件，就該開一份 ADR：

- 影響跨多個模組或目錄（例如：選擇 ORM、選擇背景任務系統、選擇 auth 方案）
- 一旦上線後翻盤成本高（資料庫格式、API 介面契約、使用者資料模型）
- 評估過多個替代方案，且選擇的理由非顯而易見
- 引入新的外部服務或執行階段依賴

**不需要寫 ADR 的情境**：bug fix、單一檔案重構、UI 樣式調整、依賴版本升級、純文件更新。

## 格式

採用 [Michael Nygard ADR](https://github.com/joelparkerhenderson/architecture-decision-record) 簡化版：

```markdown
# ADR-NNNN: 標題

- 狀態：Accepted | Superseded by ADR-XXXX | Deprecated
- 日期：YYYY-MM-DD

## 脈絡
（當時面對的問題與限制）

## 決策
（選了什麼、評估過哪些替代、為何這樣選）

## 後果
（好的、壞的、需要持續觀察的）
```

## 編號規則

- 從 `0001` 開始，**不准跳號**（由 `scripts/check-consistency.sh` 守護，Phase 2 上線）
- 檔名格式：`NNNN-kebab-case-title.md`，例如 `0002-choose-better-auth.md`
- 一旦合併進 main 就**視為不可變**——要推翻就寫一份新 ADR，並把舊 ADR 狀態改為 `Superseded by ADR-XXXX`，**不要直接改舊 ADR 的內容**

## 現有 ADR

| 編號 | 標題 | 狀態 |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | 採用 ADR 機制本身 | Accepted |

## 待補（Phase 5）

- ADR-0002：選擇 Better Auth（vs NextAuth / Clerk）
- ADR-0003：選擇 Inngest 作為背景任務（vs BullMQ / 自建 queue）
- ADR-0004：Mongoose + MongoDB 而非 Prisma
- ADR-0005：Server Actions 而非 tRPC / REST

> 草稿由 agent 起草，由人類補上「當時的真實考量」並審閱合併。
