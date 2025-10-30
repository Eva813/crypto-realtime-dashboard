import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import App from "../App";

describe("App Component", () => {
  it("應該渲染標題", () => {
    render(<App />);
    const heading = screen.getByRole("heading", { name: /vite \+ react/i });
    expect(heading).toBeInTheDocument();
  });

  it("應該顯示初始計數為 0", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: /count is 0/i });
    expect(button).toBeInTheDocument();
  });

  it("點擊按鈕應該增加計數", async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole("button", { name: /count is 0/i });
    await user.click(button);

    expect(
      screen.getByRole("button", { name: /count is 1/i }),
    ).toBeInTheDocument();
  });

  it("應該渲染 Vite 和 React logo", () => {
    render(<App />);

    const viteLogo = screen.getByAltText(/vite logo/i);
    const reactLogo = screen.getByAltText(/react logo/i);

    expect(viteLogo).toBeInTheDocument();
    expect(reactLogo).toBeInTheDocument();
  });

  it("logo 連結應該有正確的目標", () => {
    render(<App />);

    const viteLink = screen.getByRole("link", { name: /vite logo/i });
    const reactLink = screen.getByRole("link", { name: /react logo/i });

    expect(viteLink).toHaveAttribute("href", "https://vite.dev");
    expect(viteLink).toHaveAttribute("target", "_blank");

    expect(reactLink).toHaveAttribute("href", "https://react.dev");
    expect(reactLink).toHaveAttribute("target", "_blank");
  });
});
