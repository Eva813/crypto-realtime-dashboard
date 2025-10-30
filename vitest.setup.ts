import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// 擴展 Vitest 的 expect 使其包含 jest-dom 的斷言方法
expect.extend(matchers);

// 在每個測試之後自動清理 React Testing Library 的 DOM
afterEach(() => {
  cleanup();
});
