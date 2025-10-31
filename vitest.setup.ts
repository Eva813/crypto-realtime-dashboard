import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Mock React.act for React 19 compatibility
import React from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (React as any).act === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (React as any).act = (callback: () => void) => {
    callback();
  };
}

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});
