# Git Hooks 使用指南

本專案使用 **Lefthook** 管理 Git hooks，確保程式碼品質符合專案憲法要求。

## 📋 Pre-commit 檢查項目

當您執行 `git commit` 時，會自動執行以下檢查：

### 1. TypeScript 型別檢查（全專案）

```bash
pnpm exec tsc --noEmit
```

- ✅ 檢查所有 TypeScript 檔案
- ✅ 確保 strict mode 通過
- ✅ 符合憲法要求：「TypeScript strict mode MUST be enforced」

### 2. ESLint 零警告檢查（Staged 檔案）

```bash
eslint --fix --max-warnings=0
```

- ✅ 只檢查即將提交的檔案
- ✅ 自動修復可修復的問題
- ✅ 強制零警告政策
- ✅ 符合憲法要求：「Zero ESLint warnings policy」

### 3. Prettier 自動格式化（Staged 檔案）

```bash
prettier --write
```

- ✅ 自動格式化程式碼
- ✅ 確保程式碼風格一致
- ✅ 格式化後自動 re-stage

### 4. Vitest 相關測試（Staged 檔案）

```bash
vitest related --run
```

- ✅ 只執行與修改檔案相關的測試
- ✅ 不執行 E2E 測試（太慢）
- ✅ 符合憲法要求：「Test-First Development」

---

## ⚡ 效能優勢

Lefthook 使用並行執行，大幅提升速度：

```
傳統序列執行：                    Lefthook 並行執行：
├─ TypeScript     3s              ├─ TypeScript     3s  ┐
├─ ESLint         2s              └─ lint-staged    2s  ├─ 同時執行
├─ Prettier       1s                 ├─ ESLint            │
└─ Vitest         1s                 ├─ Prettier          │
────────────────────                 └─ Vitest            ┘
總計：7s                          總計：3s ⚡ 快 57%
```

---

## 🚀 使用方式

### 正常提交（推薦）

```bash
git add .
git commit -m "feat: add crypto price display"
# ✓ 自動執行所有檢查
# ✓ 通過後才能提交
```

### 手動測試 Hook

```bash
pnpm exec lefthook run pre-commit
```

### 測試特定命令

```bash
# 只測試 TypeScript
pnpm exec tsc --noEmit

# 只測試 lint-staged
pnpm exec lint-staged
```

---

## ⚠️ 檢查失敗處理

### TypeScript 錯誤

```
❌ src/utils/formatPrice.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.
```

**解決方法**：

1. 修復型別錯誤
2. 重新執行 `git commit`

### ESLint 警告/錯誤

```
❌ src/App.tsx
  12:7  error  'count' is assigned a value but never used  @typescript-eslint/no-unused-vars
```

**解決方法**：

1. 修復 ESLint 問題
2. 或執行 `pnpm exec eslint --fix .` 自動修復
3. 重新執行 `git commit`

### 測試失敗

```
❌ src/__tests__/App.test.tsx > 應該渲染標題
   AssertionError: expected null to be in the document
```

**解決方法**：

1. 修復測試或程式碼
2. 執行 `pnpm test` 驗證
3. 重新執行 `git commit`

---

## 🔧 進階功能

### 跳過 Hook（緊急情況）

```bash
git commit --no-verify -m "hotfix: critical security patch"
```

⚠️ **警告**：

- 應避免使用
- 僅限緊急修復
- 會違反憲法要求
- 需要在 PR 中說明原因

### 本地停用 Hook（開發時）

建立 `.lefthook-local.yml`（不提交到 git）：

```yaml
pre-commit:
  skip: true
```

恢復檢查時，刪除此檔案即可。

### 自訂本地配置

`.lefthook-local.yml` 範例：

```yaml
pre-commit:
  commands:
    type-check:
      skip: true # 跳過 TypeScript 檢查
    lint-staged:
      run: pnpm exec lint-staged --allow-empty
```

---

## 👥 團隊協作

### 新成員加入專案

```bash
# 1. Clone 專案
git clone <repository-url>
cd crypto-realtime

# 2. 安裝依賴（自動安裝 hooks）
pnpm install

# ✓ prepare script 自動執行
# ✓ lefthook install 自動執行
# ✓ Git hooks 已安裝
```

### 驗證 Hook 是否安裝

```bash
# 檢查 hook 檔案
ls -la .git/hooks/pre-commit

# 手動測試
pnpm exec lefthook run pre-commit
```

### 團隊規範

1. **不要跳過 hooks** - 除非緊急情況
2. **修復警告後再提交** - 維持零警告政策
3. **測試先行** - 符合 Test-First Development
4. **保持提交小而頻繁** - 檢查速度更快

---

## 📚 相關配置檔案

| 檔案                                    | 說明                        |
| --------------------------------------- | --------------------------- |
| [lefthook.yml](../lefthook.yml)         | Lefthook 主配置             |
| [.lintstagedrc.js](../.lintstagedrc.js) | lint-staged 配置            |
| [.gitignore](../.gitignore)             | Git 忽略檔案（含 lefthook） |
| [package.json](../package.json)         | NPM scripts（prepare）      |

---

## 🐛 問題排查

### Hook 沒有執行

**檢查**：

```bash
# 1. 確認 hook 已安裝
ls -la .git/hooks/pre-commit

# 2. 重新安裝
pnpm exec lefthook install

# 3. 確認 prepare script
cat package.json | grep prepare
```

### Lefthook 命令找不到

**解決**：

```bash
# 重新安裝依賴
pnpm install

# 或手動安裝
pnpm add -D lefthook
pnpm exec lefthook install
```

### 檢查太慢

**優化**：

1. 檢查是否有太多 staged 檔案
2. 考慮只提交必要的檔案
3. 大型重構可以分多次提交

```bash
# 查看 staged 檔案
git status --short

# 只 stage 特定檔案
git add src/components/Button.tsx
```

---

## 📖 更多資訊

- [Lefthook 官方文檔](https://github.com/evilmartians/lefthook)
- [lint-staged 官方文檔](https://github.com/lint-staged/lint-staged)
- [專案憲法](../.specify/memory/constitution.md)
- [測試指南](./testing.md)

---

## 🎯 憲法合規檢查表

- ✅ Pre-commit hooks MUST run linting and type checking
- ✅ Zero ESLint warnings policy
- ✅ TypeScript strict mode enforcement
- ✅ Test-First Development
- ✅ 不執行 E2E 測試（效能考量）

---

**最後更新**: 2025-10-30
**Lefthook 版本**: 2.0.2
**維護者**: 開發團隊
