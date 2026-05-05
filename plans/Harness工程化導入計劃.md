# OpenStock × Harness Engineering 導入計劃

> 產出日期：2026-05-05
> 參考來源：<https://github.com/deusyu/harness-engineering>
> 適用範圍：本專案 `d:\OpenStock\`
> 文件性質：人類掌舵、agent 執行的工程化改造藍圖

---

## 一、為什麼要做這件事

### 1.1 OpenStock 目前的 agent 友善度評估

| 構面 | 現況 | 風險 |
|---|---|---|
| Agent 入口 | 沒有 `AGENTS.md` / `CLAUDE.md`；`.claude/settings.json` 僅有設定 | Agent 進來只能靠 README 與目錄盲掃，每次都要重新摸索 |
| 規範存放處 | 規則散落於 README、ESLint config、開發者腦中 | 知識會隨人員流動腐化 |
| 機械化檢查 | 只有 `eslint`、`vitest`、`scripts/check-env.mjs`、`scripts/test-db.mjs` | 沒有跨檔一致性檢查（如 README 與實際結構是否同步） |
| Pre-commit / CI | `.github/` 只有 `FUNDING.yml`，沒有 workflow 也沒有 git hooks | Agent 提交可能引入文件漂移而沒人察覺 |
| 子目錄導航 | 各子目錄無 `AGENTS.md` | Agent 在 [components/](components/)、[lib/actions/](lib/actions/) 內判斷該不該開新檔時缺少參照 |

### 1.2 Harness Engineering 解決什麼

Harness Engineering 的核心命題是「**人類設計約束系統，agent 在約束內執行**」。它的六大原則翻譯成 OpenStock 的語言：

| 原則 | 對應到 OpenStock 要做的事 |
|---|---|
| 1. 倉庫即真相來源 | 開發決策、命名規則、API 端點清單、環境變數一律進版本控制，不放在 Notion / Slack |
| 2. 地圖優於手冊 | 根目錄一份 ~100 行 `AGENTS.md` 作為導航，細節下沉到子目錄 `AGENTS.md` |
| 3. 機械化執行 | 用 `scripts/check-consistency.sh` + 自訂 ESLint 規則守護不變式，不靠人記憶 |
| 4. Agent 可讀 | 沿用穩定技術（Next.js / Mongoose / Vitest），規範用 lint 表達而非散文 |
| 5. 熵管理 | 設置「golden rule scan」與 ADR 機制，定期清理偏差 |
| 6. 人類掌舵、agent 執行 | 改用「設計 prompt + 驗收 PR」工作流，而非親自寫每一行 |

### 1.3 與原始倉庫的差異說明

`deusyu/harness-engineering` 是**文件型倉庫**（concepts / works / practice 等知識庫目錄），它的七層一致性檢查（C1–C7）守護的是「文章編號、翻譯篇數、三脈絡計數」。

OpenStock 是**程式碼型倉庫**，所以本計劃會：

- ✅ **照搬**：六大原則、`AGENTS.md` + 子目錄 `AGENTS.md` 的兩層導航結構、`scripts/check-consistency.sh` + pre-commit + CI 三道防線的機制設計
- 🔄 **改寫**：把 C1–C7 換成適合程式碼專案的不變式（API 端點同步、env vars 同步、依賴 badge 同步、子目錄導航完整性等）
- ❌ **不照搬**：`concepts/` `thinking/` `works/` `practice/` 等知識庫目錄

---

## 二、目標與非目標

### 2.1 目標

1. 任何全新的 agent 或工程師進入專案，**5 分鐘內**能透過 `AGENTS.md` 找到完成手上任務需要的所有資訊
2. README 與實際程式碼結構（依賴清單、API 端點、env vars、scripts）的漂移**由 CI 阻擋**，而非人工發現
3. 共識規範（如「app/ 不能直接 import database/models」）由 lint 規則表達，違規 agent 改不過去就改不過去
4. 重大決策（如「為什麼選 Inngest 而不是 BullMQ」）有 ADR 留檔可追溯

### 2.2 非目標

- ❌ 不重寫現有業務邏輯
- ❌ 不引入新的執行階段依賴（所有檢查都是 build-time / commit-time）
- ❌ 不複製原倉庫的 `concepts/` / `works/` 等學習筆記目錄
- ❌ 不強制英文化（內部規範文件可中英文混用，視維護者偏好）

---

## 三、目標目錄與檔案結構

導入完成後的新增 / 異動清單：

```
d:\OpenStock\
├── AGENTS.md                      🆕 根導航（~100 行）
├── CLAUDE.md                      🆕 → 一行指向 AGENTS.md（讓 Claude Code 自動載入）
├── README.md                      🔧 加註「規範入口請見 AGENTS.md」
│
├── .githooks/
│   └── pre-commit                 🆕 跑 check-consistency.sh + lint
│
├── .github/
│   └── workflows/
│       └── consistency.yml        🆕 PR / push 觸發
│
├── docs/                          🆕 工程文件根目錄
│   ├── ADR/                       🆕 架構決策紀錄
│   │   ├── 0001-record-architecture-decisions.md
│   │   └── README.md
│   ├── conventions/               🆕 規範細節（被 AGENTS.md 引用）
│   │   ├── server-actions.md
│   │   ├── mongoose-models.md
│   │   ├── api-routes.md
│   │   └── testing.md
│   └── env-vars.md                🆕 環境變數權威清單
│
├── scripts/
│   ├── check-consistency.sh       🆕 跨檔一致性檢查（C1–C6，見第四節）
│   └── ...（既有腳本不動）
│
├── eslint.config.mjs              🔧 加入自訂規則（見第五節）
│
└── 各重要子目錄                    🆕 各加一份 AGENTS.md
    ├── app/AGENTS.md
    ├── app/api/AGENTS.md
    ├── components/AGENTS.md
    ├── database/AGENTS.md
    ├── lib/actions/AGENTS.md
    ├── lib/inngest/AGENTS.md
    ├── __tests__/AGENTS.md
    └── scripts/AGENTS.md
```

---

## 四、機械化一致性檢查（核心交付物）

`scripts/check-consistency.sh` 預計實作六項檢查，全部失敗即整體失敗，pre-commit 與 CI 共用同一支腳本。

| 編號 | 檢查項 | 守護的不變式 |
|---|---|---|
| **C1** | README badges 列出的所有依賴皆存在於 `package.json` | 防止 README 宣稱用了 X 但實際已移除 |
| **C2** | `app/api/**/route.ts` 端點清單 ≡ README「Data & Integrations」或專屬 API 段落 | 新增 / 刪除 API 必須同步更新 README |
| **C3** | `scripts/*.mjs` 檔案清單 ≡ README「Scripts & Tooling」段落 | scripts 增刪必須在 README 露出 |
| **C4** | `scripts/check-env.mjs` 中宣告的 env vars ≡ `docs/env-vars.md` ≡ README「Environment Variables」段落 | env 漂移會讓部署失敗，必須三點同步 |
| **C5** | 每個列入清單的子目錄（`app/`、`app/api/`、`components/`、`database/`、`lib/actions/`、`lib/inngest/`、`__tests__/`、`scripts/`）必須存在 `AGENTS.md` | 新建關鍵目錄時強迫補導航 |
| **C6** | 根 `AGENTS.md` 引用的所有相對路徑（檔案 / 目錄）皆實際存在 | 文件腐化的最常見來源 |

每項檢查在失敗訊息中**內嵌修復建議**（例如：「執行 `node scripts/sync-readme-deps.mjs` 自動同步」），讓 agent 能 self-correct。

> 設計原則來自原倉庫 C1–C7：先用 C1 確立權威值，後續檢查以權威值為準。OpenStock 沒有「文章編號」這類權威，所以權威值來自 `package.json` 與檔案系統實際狀態。

---

## 五、ESLint 自訂規則（程式碼層的守門員）

文件層由 `check-consistency.sh` 守護，程式碼層由 ESLint 守護。預計新增的規則：

| 規則 | 用途 | 違規範例 |
|---|---|---|
| `no-direct-model-import-from-app` | 禁止 `app/**` 直接 `import` `database/models/*`，必須走 `lib/actions/` | Server Component 直接讀 mongoose model 繞過 action 層 |
| `mongoose-schema-must-have-timestamps` | `database/models/*.ts` 中 `new Schema(...)` 必須帶 `{ timestamps: true }` | 新模型忘記時間戳 |
| `server-action-naming` | `lib/actions/*.ts` 匯出函式必須以動詞開頭（get / create / update / delete / sync / ...） | 命名混亂導致 agent 找不到 |
| `no-process-env-outside-lib` | 禁止 `process.env.*` 出現在 `lib/` 之外（避免散落） | components 內偷讀 env 導致 SSR 不一致 |

> 實作方式：`eslint.config.mjs` 內 inline 寫 `no-restricted-imports` / `no-restricted-syntax` 規則，不引入外部 plugin，確保 agent 可讀性（原則 4）。

---

## 六、AGENTS.md 寫作規範

### 6.1 根 `AGENTS.md`（~100 行硬上限）

包含且僅包含以下七段：

1. **這是什麼專案**（3 行）
2. **技術堆疊速覽**（表格）
3. **常用指令**（dev / build / lint / test / test:db）
4. **目錄地圖**（表格，每行一個重要目錄 + 一句話用途 + 連結到子 AGENTS.md）
5. **不變式**（條列規則，附註「由 `scripts/check-consistency.sh` 與 ESLint 強制」）
6. **常見任務的入口**（「我要新增一個 API 端點 → 請看 [docs/conventions/api-routes.md](docs/conventions/api-routes.md)」）
7. **機械化檢查**（如何在本機跑、如何啟用 pre-commit）

> 超過 100 行 = 違反原則 2「地圖優於手冊」，細節必須下沉到 `docs/conventions/` 或子目錄 `AGENTS.md`。

### 6.2 子目錄 `AGENTS.md`

每份回答四個問題：

1. **這個目錄裝什麼**
2. **新增一個檔案時的 checklist**（命名、必備 export、要不要加測試）
3. **不要做什麼**（已知的反模式）
4. **延伸閱讀**（連回 `docs/conventions/` 對應規範）

---

## 七、ADR 機制

### 7.1 為什麼需要

OpenStock 已經做過不少有意思的選擇（Better Auth 而非 NextAuth、Inngest 而非 BullMQ、Mongoose 而非 Prisma+Mongo），但這些**「為什麼」沒有留在倉庫裡**。Agent 想重構時不知道哪些是刻意選擇、哪些是隨手寫的，容易做出反向決策。

### 7.2 格式

採用 [Michael Nygard ADR](https://github.com/joelparkerhenderson/architecture-decision-record) 簡化版，存在 [docs/ADR/](docs/ADR/)，編號連續：

```markdown
# ADR-NNNN: 標題

- 狀態：Accepted | Superseded by ADR-XXXX | Deprecated
- 日期：YYYY-MM-DD

## 脈絡
（當時面對的問題與限制）

## 決策
（選了什麼、怎麼選的）

## 後果
（好的、壞的、需要持續觀察的）
```

`check-consistency.sh` 的 **C1（編號連續）** 套用在 ADR 上：`ADR-0001`、`ADR-0002`... 不准跳號。

### 7.3 第一批待補 ADR

- ADR-0001：採用 ADR 機制本身（meta）
- ADR-0002：選擇 Better Auth（vs NextAuth / Clerk）
- ADR-0003：選擇 Inngest 作為背景任務（vs BullMQ / queue）
- ADR-0004：Mongoose + MongoDB 而非 Prisma
- ADR-0005：Server Actions 而非 tRPC / REST

> 這些 ADR 由 agent 草擬、由人類審閱補上「當時的真實考量」。

---

## 八、實施階段（Phased Rollout）

採用「**先骨架、後血肉**」策略，每階段都能獨立合併、不阻塞既有開發。

### Phase 0 — 預備（半天）
- [ ] 在 GitHub 建立 `harness-engineering` 標籤（issue / PR 用）
- [ ] 確認 CI 預算與 Action runner 額度
- [ ] **里程碑**：本計劃書合併入 main

### Phase 1 — 骨架建立（1 天）
- [ ] 寫根 `AGENTS.md`（~100 行）
- [ ] 寫 `CLAUDE.md`（單行指向 `AGENTS.md`）
- [ ] 建立 `docs/ADR/`、`docs/conventions/` 空骨架 + README
- [ ] 寫 ADR-0001（採用 ADR 機制）
- [ ] **驗收**：新 agent 能從 `AGENTS.md` 走到任一子目錄

### Phase 2 — 機械化檢查 v1（1–2 天）
- [ ] 寫 `scripts/check-consistency.sh`，先實作 C1 + C5 + C6（最容易、最高 ROI）
- [ ] 設定 `.githooks/pre-commit`，文件中說明 `git config core.hooksPath .githooks` 啟用
- [ ] 寫 `.github/workflows/consistency.yml`
- [ ] **驗收**：故意改壞 README badge → CI 阻擋

### Phase 3 — 子目錄導航（2 天）
- [ ] 為 8 個重點子目錄各寫一份 `AGENTS.md`
- [ ] 寫 `docs/conventions/` 中四份核心規範
- [ ] 寫 `docs/env-vars.md`，從 `scripts/check-env.mjs` 反向梳理
- [ ] **驗收**：C5（子目錄導航完整性）通過

### Phase 4 — 機械化檢查 v2（2 天）
- [ ] 補完 C2（API 端點同步）、C3（scripts 同步）、C4（env vars 三點同步）
- [ ] 在 `eslint.config.mjs` 加入第五節列出的自訂規則
- [ ] 跑一次完整 lint，修掉既有違規（預估 < 20 處）
- [ ] **驗收**：`bash scripts/check-consistency.sh && npm run lint && npm test` 全綠

### Phase 5 — ADR 補登（1 天，可與 Phase 4 並行）
- [ ] 補 ADR-0002 ~ 0005
- [ ] 在根 `AGENTS.md` 連到 `docs/ADR/`
- [ ] **驗收**：人類審閱通過

### Phase 6 — 熵管理啟動（持續）
- [ ] 設定每月一次的 GitHub Action 跑「golden rule scan」（grep 已知反模式並開 issue）
- [ ] 把首批掃描結果整理成 issue 列表，由 agent 認領清理

---

## 九、風險與緩解

| 風險 | 影響 | 緩解 |
|---|---|---|
| 既有開發者抗拒「又要寫文件」 | 計劃停在 Phase 1 不前進 | 先做 C1/C5/C6 證明價值（CI 真的攔下漂移），再推 Phase 3 |
| `check-consistency.sh` 在 Windows / Git Bash 跑不動 | Pre-commit hook 失效 | 用 POSIX-only 語法 + 在 CI 用 `ubuntu-latest` 兜底；本機失敗不阻擋，CI 失敗才阻擋合併 |
| 自訂 ESLint 規則寫錯導致全專案跑不過 | 開發停擺 | 規則先以 `warn` 上線兩週、確認無誤後才升 `error` |
| AGENTS.md 寫成「散文式手冊」，超過 100 行 | 退化成原本 README 的問題 | Phase 2 加 C7：根 `AGENTS.md` ≤ 120 行（含空行） |
| 計劃書與實際導入結果漂移 | Plans 目錄變成廢墟 | 完工後本檔加註「Status: Implemented」並指向實際的 `AGENTS.md` |

---

## 十、成功指標

導入後 **2 個月** 應觀察到：

1. 新 agent 任務的「初次正確率」提升（少於兩輪 review 即合併的 PR 比例）
2. README 漂移類 PR comment 趨近於零（CI 已先攔下）
3. 至少 1 次重大重構決策時，ADR 真的被人類查閱並影響決策
4. `check-consistency.sh` 在 CI 累計阻擋至少 5 次違規（證明它在做事，不是裝飾）

未達標時的回退策略：保留 `AGENTS.md` 與 ADR（純文件成本低），移除過度嚴格的 ESLint 規則與 C2/C3/C4 檢查（保留 C1/C5/C6）。

---

## 十一、待人類確認事項

> 2026-05-05：使用者已回覆，本節由「待確認」轉為「已確認紀錄」。

| # | 問題 | 結論 |
|---|---|---|
| 1 | 計劃書本身要不要先合併進 main？ | ✅ 要，與 Phase 1 產出一同合併 |
| 2 | `AGENTS.md` 要中文還是英文？ | **混合策略**：給 agent 看的（根 / 子目錄 `AGENTS.md`）用英文；給人類讀的使用說明（`docs/conventions/`、`docs/ADR/`）用中文。README 維持英文 |
| 3 | CI 預算？ | OpenStock 是 public repo，GitHub Actions 對 public repo 無分鐘上限，視為通過 |
| 4 | Phase 順序可否調整？ | 不調整，照 Phase 0 → 6 順序進行 |
| 5 | 是否啟用全域 git hook 為強制？ | **改為 CI 兜底為強制**：使用者明確要求「push 到 GitHub 時自動測試、CI 綠燈才能合併進 main」。Phase 2 上 CI workflow 後，需在 GitHub 設定 branch protection（`main` 要求 status check 通過才可合併）。本機 pre-commit 仍提供但不強制

---

## 附錄 A — 與原倉庫對照表

| `harness-engineering` 結構 | OpenStock 對應 | 為何如此對應 |
|---|---|---|
| `AGENTS.md`（~100 行導航） | `AGENTS.md` | 直接照搬，這是核心 |
| `concepts/` / `thinking/` / `works/` | （不對應） | OpenStock 不是學習型倉庫 |
| `references/articles.md` | （不對應） | 同上 |
| `scripts/check-consistency.sh` C1–C7 | `scripts/check-consistency.sh` C1–C6 | 改寫成程式碼專案的不變式 |
| `.githooks/pre-commit` | `.githooks/pre-commit` | 直接照搬機制 |
| `.github/workflows/consistency.yml` | `.github/workflows/consistency.yml` | 直接照搬機制 |
| 「文件會腐爛、lint 規則不會」 | `eslint.config.mjs` 自訂規則 + `check-consistency.sh` | 同一原則的程式碼版實踐 |
| ADR | `docs/ADR/` | 原倉庫沒有，但屬於原則 1（倉庫即真相）的自然延伸 |

## 附錄 B — 外部 API / 服務需求清單

> 本節在 2026-05-05 補登，動機：實際嘗試本機啟動時發現 `.env` 缺項是最大阻礙。
> 此清單是 §四 C4 檢查（env vars 三點同步）的權威來源之一，未來新增外部依賴必須回頭更新本表。

### B.1 必要服務（缺一即無法跑完整功能）

| 服務 | 用途 | 申請方式 | 免費額度 | 對應 env var |
|---|---|---|---|---|
| **MongoDB** | 使用者、watchlist、auth session、onboarding 偏好 | MongoDB Atlas 免費 M0 cluster；或本機 Docker（[docker-compose.yml](../docker-compose.yml) 已備） | Atlas M0：512MB 永久免費 | `MONGODB_URI` |
| **Better Auth** | 自管 secret，不需第三方註冊 | 自行產生 ≥32 字元亂數（`openssl rand -base64 32`） | 不適用 | `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` |
| **Finnhub** | 股票符號搜尋、公司 profile、新聞 | <https://finnhub.io/register> | 60 calls/min，個股延遲行情 | `NEXT_PUBLIC_FINNHUB_API_KEY` / `FINNHUB_BASE_URL` |
| **Google Gemini** | AI 個人化歡迎信內文、每日新聞摘要 | <https://aistudio.google.com/apikey> | Free tier：15 RPM / 1M TPM（gemini-flash） | `GEMINI_API_KEY` |
| **Inngest** | 背景任務（cron 寄信、AI 推論排程） | <https://app.inngest.com>（GitHub 登入） | 免費 50K events/month | `INNGEST_SIGNING_KEY` |
| **Gmail SMTP** | 透過 Nodemailer 寄出歡迎信、每日摘要 | 帳號 + [App Password](https://myaccount.google.com/apppasswords)（須開 2FA） | Gmail 免費，每日寄送上限 500 封 | `NODEMAILER_EMAIL` / `NODEMAILER_PASSWORD` |

### B.2 可選服務（不影響核心可用性）

| 服務 | 用途 | 申請方式 | 對應 env var |
|---|---|---|---|
| **Adanos** | 跨來源情緒分析（Reddit / X / 新聞 / Polymarket） | <https://adanos.org>（API key） | `ADANOS_API_KEY` / `ADANOS_API_BASE_URL` |
| **MiniMax** | Gemini 之外的 AI provider 備援 | <https://platform.minimaxi.com> | `MINIMAX_API_KEY`（搭配 `AI_PROVIDER=minimax`） |
| **Siray** | 第三方 AI provider 選項 | （視 [lib/ai-provider.ts](../lib/ai-provider.ts) 實作） | （搭配 `AI_PROVIDER=siray`） |
| **TradingView 圖表** | 圖表 / heatmap / 行情 widget | 內嵌 script，**無需 API key** | 無 |

### B.3 內建（不須申請）

- **TradingView widgets**：透過官方 embed script 載入，沒有 token 機制，所有圖表類功能在 dummy env 下也能正常顯示

### B.4 「沒 MongoDB 看不看得到 UI」實測修正

> ⚠️ **2026-05-05 實測修正**：原本以為「dummy env 還能看 UI 殼」，**實測證明錯誤**。
> 根本原因：[app/layout.tsx](../app/layout.tsx) 在每個請求都呼叫 `getAuth()` →
> 觸發 [database/mongoose.ts](../database/mongoose.ts) 的 `connectToDatabase()` →
> dummy `MONGODB_URI` 連不上 → `MongooseServerSelectionError` →
> **整站無法渲染任一頁面**（連首頁也沒有）。
>
> 這條觀察直接寫進本計劃書 §五（ESLint 自訂規則）的候選清單：
> 「考慮新增 `no-auth-call-in-root-layout` 規則，或讓 `getAuth()` 在 dummy env 下優雅降級」。
> 屬於 Phase 4+ 的事；現階段繞過方式見 B.4.1。

#### B.4.1 沒有 MongoDB 時的繞過選項（依推薦順序）

| 方法 | 適用場景 | 取捨 |
|---|---|---|
| MongoDB Atlas 免費 M0 | **首選** | 雲端、5 分鐘設定、永久免費、不污染本機 |
| Docker Compose 起單一服務 | 已有 Docker Desktop | `docker compose up -d mongodb`（[docker-compose.yml](../docker-compose.yml) 已備） |
| `winget install MongoDB.Server` | Windows 本機快裝 | 會在系統裝 service、開機自啟，須日後手動移除 |
| 純讀程式碼 | 不打算實際跑 | 看 [components/](../components/) 與 [app/](../app/) 的 JSX |

#### B.4.2 連到 MongoDB 之後的「能看 / 不能看」對照

| 能看 ✅ | 不能看 ❌ |
|---|---|
| 首頁、Header / Footer、Dark theme | Finnhub 驅動的搜尋（Cmd+K） |
| 登入 / 註冊頁面 + 實際登入註冊 | 真實股票 quote / news（Finnhub 401） |
| TradingView 圖表 widget（自帶 demo 資料） | AI 個人化歡迎信、每日摘要寄送 |
| shadcn/ui 元件、Onboarding 表單與儲存 | Adanos 情緒分析（若未設） |
| 個人 watchlist 讀寫 | |

### B.5 新增外部服務的流程（給未來的 agent）

當需要接入新的第三方 API 時，必須**同步更新四處**（這就是 §四 C4 守護的不變式）：

1. [scripts/check-env.mjs](../scripts/check-env.mjs) 加入 required / optional 變數
2. [README.md](../README.md) §Environment Variables 加入範例
3. [docs/env-vars.md](../docs/env-vars.md) 補完整說明（Phase 3 後存在）
4. **本附錄 B.1 / B.2** 加入服務名、用途、申請連結、免費額度

漏掉任何一處 → CI 阻擋合併。

---

## 附錄 C — 參考連結

- 原倉庫：<https://github.com/deusyu/harness-engineering>
- OpenAI 原始概念：<https://openai.com/index/harness-engineering/>
- Martin Fowler 提到的 Harness 概念：見原倉庫 `concepts/06-harness-definitions.md`
- Anthropic Managed Agents：見原倉庫 `works/anthropic-managed-agents-translation.md`

---

**Status**: In Progress（Phase 0 + Phase 1 完成於 2026-05-05；§11 已確認；下一步 Phase 2 機械化檢查 v1）
