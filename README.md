# Crypto Realtime

A high-performance, real-time cryptocurrency price tracking application built with React, TypeScript, and Vite. This application follows strict constitutional principles for code quality, testing standards, user experience consistency, and performance requirements.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

## Constitutional Compliance

This project follows strict development principles outlined in `.specify/memory/constitution.md`:

### Quick Compliance Checklist

Before committing code, ensure:

- ✓ TypeScript strict mode with zero ESLint warnings
- ✓ Minimum 80% test coverage (100% for critical paths)
- ✓ WCAG 2.1 AA accessibility compliance
- ✓ Core Web Vitals targets met (FCP <1.5s, LCP <2.5s, TTI <3.5s)
- ✓ Bundle size under 250KB gzipped
- ✓ Real-time data integrity indicators implemented

### Documentation

- [Testing Guide](docs/testing.md) - Comprehensive testing strategies and best practices
- [Git Hooks Guide](docs/git-hooks.md) - Pre-commit checks and workflow automation

### Development Commands

```bash
# Install dependencies
pnpm install

# Start development server with performance monitoring
pnpm dev

# Run linting with zero warnings enforcement
pnpm lint

# Build with performance budgets
pnpm build

# Run tests with coverage reporting
pnpm test --coverage

# Preview production build
pnpm preview
```

### Architecture Principles

- **Test-First Development**: Write tests before implementation (TDD)
- **Mobile-First Design**: Responsive design starting from mobile breakpoints
- **Performance-First**: 60 FPS interactions, optimized bundle splitting
- **Accessibility-First**: WCAG 2.1 AA compliance for all components
- **Real-Time Integrity**: Clear connection status and data freshness indicators

For detailed development guidelines, see `.specify/memory/constitution.md`.
