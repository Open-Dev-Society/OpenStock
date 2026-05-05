# Conventions

本目錄存放 OpenStock 的**詳細規範文件**。根 [AGENTS.md](../../AGENTS.md) 只擺導航與不變式條列，細節下沉到本目錄。

## 待補文件（Phase 3）

- `api-routes.md`：新增 `app/api/**/route.ts` 的命名、目錄結構、錯誤處理慣例
- `mongoose-models.md`：在 `database/models/` 新增 schema 的必備欄位、命名、索引設計
- `server-actions.md`：`lib/actions/` 內函式命名（動詞開頭）、錯誤回傳格式、與 server component 的整合
- `testing.md`：Vitest 測試擺哪、命名、要不要 mock 資料庫

每份文件預計 50–150 行，回答「**怎麼做才對**」與「**為什麼有這個規定**」。

## 寫作原則

1. **可機械化的規則優先用 ESLint 表達**，這裡只放需要散文說明的部分（例：「為什麼 server action 要動詞開頭」）
2. 每份規範文件結尾都該連回對應的 ESLint 規則或 `scripts/check-consistency.sh` 檢查項，方便讀者驗證
3. 若規範來自某次重大決策，連結到對應的 [docs/ADR/](../ADR/)
