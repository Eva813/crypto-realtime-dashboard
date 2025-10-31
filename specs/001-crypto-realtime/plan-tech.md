product:
name: "crypto-realtime"
description: |
Crypto Realtime Dashboard 是一個前端專案，提供即時加密貨幣行情與圖表，支援即時價格更新、K 線圖、收藏自選幣種清單。
目標用戶為想快速瀏覽幣價的投資人以及練習前端即時資料處理的工程師。

We are going to generate this use React with the following specifications:
use pnpm as package manager
variant: "TypeScript + React Compiler"
state_management: "Zustand or React Context for global state (favorites, WebSocket status)"
data_fetching: - "TanStack Query: REST API 初始資料 + WebSocket 更新"
websocket: "Binance WebSocket API"
chart_library: "Lightweight Charts (TradingView open-source) or Recharts"
styling: "Tailwind CSS + ShadCN"

## 關於 UI:

## 🎨 一、配色方向：溫和復古（Soft Retro）

| 類型                  | 顏色建議                             | Tailwind 範例變數  | 效果               |
| --------------------- | ------------------------------------ | ------------------ | ------------------ |
| **背景底色**          | #f8f5f1（奶油白）、#f3ede3（紙色）   | `bg-[#f8f5f1]`     | 柔和、懷舊紙質底色 |
| **主要色（Primary）** | #3a5a40（深橄欖綠）、#4d2c23（棕紅） | `text-[#3a5a40]`   | 復古銀行風格       |
| **輔助色（Accent）**  | #d4a373（暖焦糖）、#b07d62（舊皮革） | `accent-[#d4a373]` | 柔暖質感           |
| **錯誤／警示色**      | #d17a22（焦橘）、#9b2226（復古紅）   | `text-[#d17a22]`   | 復古電腦指示燈感   |
| **字體顏色**          | #2e2c2b（深墨灰）                    | `text-[#2e2c2b]`   | 柔和文字對比       |

---

## 🧁 二、Tailwind 自訂主題設定範例

如果你使用 Tailwind + ShadCN，可以在 `tailwind.config.ts` 中定義復古色主題：

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🎨 Navy + Cream 復古色系
        background: {
          DEFAULT: "#eae0d5", // 奶油底色
          dark: "#22333b", // 深藍背景（暗色模式可用）
        },
        primary: {
          DEFAULT: "#22333b", // 主色 - 深藍
          foreground: "#eae0d5", // 搭配淺色文字
        },
        accent: {
          DEFAULT: "#c6ac8f", // 輔助焦糖色
          hover: "#b89674", // hover 焦糖深色
        },
        border: "#c6ac8f",
        muted: "#a68a64",
        text: {
          DEFAULT: "#22333b", // 主要文字
          secondary: "#3c4a53", // 較淡文字
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans TC", "sans-serif"],
        display: ["Playfair Display", "serif"], // 用於標題
      },
      boxShadow: {
        soft: "0 2px 6px rgba(34, 51, 59, 0.08)",
        inset: "inset 0 1px 2px rgba(34, 51, 59, 0.05)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 🪞 三、UI 組件風格建議（搭配 ShadCN / Radix + Navy + Cream）

| 元件                  | 設計建議                       | 範例                                                                                                  |
| --------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **按鈕**              | 奶油文字 + 焦糖背景 + 柔和陰影 | `bg-accent text-background rounded-xl shadow-soft hover:bg-accent-hover transition-all`               |
| **卡片**              | 奶油底 + 深藍邊框 + 柔光陰影   | `bg-background border border-[#c6ac8f] rounded-2xl shadow-[0_2px_6px_rgba(34,51,59,0.08)]`            |
| **表格 (OrderBook)**  | 行高舒適、邊線細虛線、深藍字體 | `divide-y divide-[#c6ac8f]/50 text-[#22333b] text-sm`                                                 |
| **標題字體**          | Serif 標題、深藍色字           | `font-display text-[#22333b]`                                                                         |
| **按鈕 Hover 效果**   | 焦糖 → 深焦糖過渡              | `hover:bg-[#b89674] transition-all`                                                                   |
| **導航列 / Header**   | 深藍背景 + 奶油字體            | `bg-primary text-primary-foreground shadow-soft`                                                      |
| **輸入框 / 下單面板** | 奶油底 + 焦糖邊框 + 內陰影     | `bg-background border border-accent shadow-inset text-[#22333b] focus:ring-2 focus:ring-accent-hover` |

---

顏色邏輯總覽

| 名稱                     | Hex                    | 用途 |
| ------------------------ | ---------------------- | ---- |
| **深藍 (`#22333b`)**     | 文字 / 主色背景        |      |
| **奶油 (`#eae0d5`)**     | 頁面背景 / 卡片底色    |      |
| **焦糖 (`#c6ac8f`)**     | 強調 / 按鈕底色 / 邊框 |      |
| **焦糖深色 (`#b89674`)** | Hover 狀態             |      |
| **淡焦糖 (`#d8c3a5`)**   | 分隔線 / Muted 背景    |      |

實際按鈕範例

```
export function RetroButton() {
  return (
    <button className="bg-accent hover:bg-accent-hover text-background font-semibold px-4 py-2 rounded-xl shadow-soft transition">
      Place Order
    </button>
  );
}
```

✨ 卡片範例

```
export function RetroCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background border border-[#c6ac8f] rounded-2xl shadow-[0_2px_6px_rgba(34,51,59,0.08)] p-4">
      {children}
    </div>
  );
}
```
