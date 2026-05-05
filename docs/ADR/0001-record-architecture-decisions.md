# ADR-0001: 採用 ADR 機制紀錄架構決策

- 狀態：Accepted
- 日期：2026-05-05

## 脈絡

OpenStock 已經做過數個非顯而易見的技術選擇——Better Auth 而非 NextAuth、Inngest 而非 BullMQ、Mongoose 而非 Prisma、Server Actions 而非 tRPC——但**選擇背後的「為什麼」沒有留在倉庫裡**。當前狀況：

- 新進工程師 / agent 看到 Mongoose 不喜歡，提議改用 Prisma，但不知道當初評估過 schema 變動頻率與 migration 成本
- 重構 PR 想砍掉 Inngest 改回直接 setTimeout，但忘了當初為了 cron + 重試 + observability 才引入
- 散文式 README 描述「現在用什麼」，但無法回答「為什麼」與「曾經評估過什麼」

倉庫缺乏一個**輕量、可版本控制、寫了不改**的決策歷史機制。Notion / Slack 的紀錄會隨員工流動腐化；commit message 太短、PR description 太散；ADR 是業界對這個問題的標準答案。

## 決策

採用 **Architecture Decision Records（ADR）** 機制，具體規則：

1. **存放位置**：[docs/ADR/](.)
2. **格式**：Michael Nygard 簡化版三段式（脈絡 / 決策 / 後果），詳見 [README.md](README.md)
3. **編號**：從 `0001` 起連續、不准跳號，由 `scripts/check-consistency.sh` 守護（Phase 2 上線後生效）
4. **不可變性**：合併進 main 之後不修改既有 ADR 內容；要翻案就寫新 ADR、把舊的狀態改為 `Superseded by ADR-XXXX`
5. **觸發條件**：跨模組決策、翻盤成本高的決策、引入新外部依賴的決策。Bug fix、UI 調整、文件更新不需要

評估過的替代：

- **不留紀錄**（現狀）：成本最低，但決策資訊隨人員流動消失。否決
- **寫進 README 或 docs/**：散文式書寫無法表達「當時 vs 現在」的差異，舊決策會被新內容覆蓋。否決
- **Notion / Confluence 外部知識庫**：脫離版本控制，違反 Harness Engineering 原則 1（倉庫即真相來源）。否決
- **完整版 ADR（Y-statements、MADR）**：欄位多但門檻高，會讓人懶得寫。選 Nygard 簡化版降低 friction

## 後果

**好處**

- 重大決策的「為什麼」與「評估過什麼」永久留在倉庫，agent 與人類都能讀
- 重構提案被迫先讀過相關 ADR、論證原前提已改變，避免循環翻案
- 連續編號 + 機械化檢查 → 不會漏編、不會悄悄消失

**壞處**

- 寫 ADR 是額外負擔，需要團隊養成習慣（Phase 5 會由 agent 草擬 ADR-0002 ~ 0005 降低初期成本）
- 過度紀錄會稀釋訊號（任何小改都寫 ADR ⇒ 沒人讀）。對策：在 [README.md](README.md) 明確列出「不需要寫 ADR」的情境

**需要持續觀察**

- 6 個月後檢視：ADR 是否真的被引用過至少一次（成功指標 §十.3）
- 若 ADR 數量超過 30 份還沒被引用過，代表機制空轉，需重新檢討門檻或廢除
- 編號連續性檢查在 Windows / Git Bash 是否穩定（風險 §九）
