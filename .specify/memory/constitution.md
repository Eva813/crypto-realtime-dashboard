<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- Modified principles: Initial constitution creation
- Added sections: Core Principles, Performance Standards, Development Workflow
- Removed sections: None (initial creation)
- Templates requiring updates: All templates validated and aligned
- Follow-up TODOs: None
-->

# Crypto Realtime Constitution

## Core Principles

### I. Code Quality Excellence (NON-NEGOTIABLE)
TypeScript strict mode MUST be enforced across all code. Zero ESLint warnings policy - all warnings MUST be resolved before commit. No `any` types without explicit justification and documentation. Single Responsibility Principle MUST guide all component and function design. Files exceeding 250 lines MUST be refactored into smaller, focused modules.

**Rationale**: High-quality code reduces bugs, improves maintainability, and ensures consistent development velocity. TypeScript's type system prevents runtime errors that are critical in financial applications handling real-time data.

### II. Test-First Development (NON-NEGOTIABLE)
Minimum 80% test coverage MUST be maintained. Critical business logic paths require 100% coverage. Tests MUST be written before implementation (TDD). All React components, custom hooks, and utility functions require comprehensive unit tests. WebSocket connections and API integrations require integration tests.

**Rationale**: Test-first development ensures reliable real-time crypto data display. Financial applications demand zero tolerance for data display errors or connection failures.

### III. User Experience Consistency
WCAG 2.1 AA accessibility compliance is MANDATORY. Mobile-first responsive design with standard breakpoints (mobile <768px, tablet 768-1024px, desktop >1024px). Design system adherence - no one-off styles or arbitrary colors. Loading states MUST be shown for actions >300ms. Error boundaries MUST gracefully handle component failures.

**Rationale**: Consistent UX builds user trust in financial applications. Accessibility ensures inclusive access to crypto market data. Clear feedback prevents user confusion during real-time data updates.

### IV. Performance Standards
First Contentful Paint <1.5s, Largest Contentful Paint <2.5s, Time to Interactive <3.5s MUST be maintained. 60 FPS interactions required for all animations. WebSocket updates MUST be throttled to prevent excessive re-renders. Initial bundle size cannot exceed 250KB gzipped. Memory leaks are forbidden - monitor with DevTools.

**Rationale**: Fast performance is critical for real-time crypto trading decisions. Users need immediate access to price data without lag or stuttering that could impact financial decisions.

### V. Real-Time Data Integrity
WebSocket connection status MUST be visible to users. Data staleness indicators are REQUIRED. Graceful degradation to polling when WebSocket fails. Price change animations MUST use subtle, non-distracting indicators. Connection failures require automatic retry with exponential backoff.

**Rationale**: Users must clearly understand data freshness for informed trading decisions. Visual indicators prevent misinterpretation of stale data as current market conditions.

## Performance Standards

Real User Monitoring (RUM) MUST track Core Web Vitals. Performance budgets MUST be enforced in CI/CD pipeline. Code splitting is REQUIRED - route-based chunks with component lazy loading. Asset optimization mandatory: WebP images with fallbacks, font-display swap, Brotli compression. Third-party libraries isolated in separate chunks to prevent main bundle bloat.

## Development Workflow

Conventional commits format MANDATORY (feat:, fix:, docs:, refactor:, perf:, test:). All code requires peer review approval. No direct commits to main branch. Pre-commit hooks MUST run linting and type checking. Documentation updates required for all public APIs and component props. Dependency audits required monthly with immediate security patch application.

## Governance

This constitution supersedes all other development practices. Amendments require team consensus and version increment. All pull requests MUST verify constitutional compliance. Performance regressions block releases. Security vulnerabilities require immediate hotfix deployment. Constitution violations require written justification and remediation plan.

## **Documentation Language:**

- All specifications, plans, and user-facing documentation MUST be written in Traditional Chinese (zh-TW)
- Code comments and technical documentation MAY use English for technical clarity
- Commit messages and internal development notes MAY use English


**Version**: 1.0.0 | **Ratified**: 2025-10-30 | **Last Amended**: 2025-10-30
