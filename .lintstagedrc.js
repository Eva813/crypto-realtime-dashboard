/**
 * Lint-staged 配置
 * 只對 staged 檔案執行檢查，提升效能
 * 符合專案憲法要求：零警告政策 + Test-First Development
 */

export default {
  // TypeScript/JavaScript 檔案
  "*.{ts,tsx,js,jsx}": [
    // 1. ESLint 檢查和自動修復（憲法要求：零警告政策）
    "pnpm exec eslint --fix --max-warnings=0",

    // 2. Prettier 格式化
    "pnpm exec prettier --write",

    // 3. 執行相關測試（憲法要求：Test-First Development）
    // 只執行與修改檔案相關的測試，不包含 E2E 測試
    "pnpm exec vitest related --run",
  ],

  // 樣式檔案
  "*.{css,scss,less}": ["pnpm exec prettier --write"],

  // Markdown 和配置檔案
  "*.{md,json,yaml,yml}": ["pnpm exec prettier --write"],
};
