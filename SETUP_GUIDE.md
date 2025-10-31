# Setup & Installation Guide

## Prerequisites

- Node.js 16+ (or 18+ recommended)
- pnpm 8+ (or npm/yarn)
- Git

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd crypto-realtime
```

### 2. Install Dependencies

```bash
pnpm install
```

Or with npm:
```bash
npm install
```

### 3. Environment Setup

Create `.env.local` in project root:

```env
# Binance WebSocket URL
VITE_BINANCE_WS_URL=wss://stream.binance.com:9443/ws

# Binance REST API
VITE_API_URL=https://api.binance.com
```

## Development

### Start Dev Server

```bash
pnpm dev
```

Server runs at `http://localhost:5173`

### Features in Development

- Hot Module Replacement (HMR)
- TypeScript strict type checking
- ESLint code validation
- React Compiler optimization

### Code Quality

Run linter:
```bash
pnpm lint
```

Run type checker:
```bash
pnpm build
```

Run tests:
```bash
pnpm test
```

### File Structure

```
src/
├── components/          # React components
│   ├── crypto/         # Crypto-specific components
│   ├── chart/          # Chart components
│   ├── common/         # Shared components
│   └── __tests__/      # Component tests
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # API and business logic
│   ├── binance/       # Binance WebSocket service
│   ├── storage/       # localStorage service
│   └── query/         # TanStack Query config
├── stores/             # Zustand state management
├── utils/              # Utility functions
│   ├── validation.ts  # Zod schemas
│   ├── format.ts      # Format utilities
│   └── throttle.ts    # Performance utilities
├── types/              # TypeScript type definitions
└── App.tsx             # Root component
```

## Testing

### Run Tests

```bash
pnpm test          # Watch mode
pnpm test -- --run # Single run
```

### Test Types

- **Unit Tests**: `src/utils/__tests__/`
- **Component Tests**: `src/components/__tests__/`
- **E2E Tests**: `src/__tests__/`

### Coverage

```bash
pnpm test -- --coverage
```

## Building

### Production Build

```bash
pnpm build
```

Output in `dist/` directory.

### Build Analysis

```bash
pnpm build
pnpm preview  # Preview built version
```

## Common Tasks

### Add New Cryptocurrency

1. Subscribe in `useCryptoPrices` hook
2. Define validation in `src/utils/validation.ts`
3. Use in components

### Add New Page

1. Create component in `src/pages/`
2. Define route in `src/App.tsx`
3. Add navigation

### Add New Hook

1. Create in `src/hooks/`
2. Export from main hooks file
3. Add tests

### Update Styles

1. Edit component CSS file
2. Run `pnpm lint` to check
3. Rebuild to verify

## Debugging

### Browser DevTools

1. Open Chrome DevTools (F12)
2. Check Console tab for errors
3. Use Network tab for API calls
4. Use Elements tab to inspect components

### React DevTools

Install React DevTools extension:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/)
- [Firefox](https://addons.mozilla.org/firefox/addon/react-devtools/)

### Redux DevTools

Check WebSocket connections and state updates.

## Performance

### Code Splitting

Components are automatically code-split by Vite.

### Bundle Size

Current sizes:
- CSS: 2.88 KB (gzipped)
- JS: 142.22 KB (gzipped)

### Performance Tips

1. Use `React.memo` for expensive components
2. Throttle high-frequency updates
3. Use lazy loading for modals
4. Monitor bundle size with `pnpm build`

## Deployment

### Build Locally

```bash
pnpm build
```

### Deploy to Vercel

```bash
vercel
```

### Deploy to Netlify

```bash
netlify deploy --prod --dir=dist
```

### Environment Variables in Production

Set these in hosting platform:
- `VITE_BINANCE_WS_URL`
- `VITE_API_URL`

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### WebSocket Connection Issues

1. Check Binance API is accessible
2. Verify firewall settings
3. Check browser console for errors

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules dist
pnpm install
pnpm build
```

### Type Errors

```bash
# Check TypeScript
pnpm build

# Fix auto-fixable errors
pnpm lint -- --fix
```

## Git Workflow

### Branch Naming

- Feature: `feature/description`
- Bug: `bugfix/description`
- Release: `release/version`

### Commit Messages

```
feat: Add new hook useWebSocket
fix: Resolve price update throttling
docs: Update API reference
style: Format code
test: Add component tests
chore: Update dependencies
```

### Pull Request

1. Create feature branch
2. Make changes
3. Run tests: `pnpm test`
4. Lint: `pnpm lint`
5. Build: `pnpm build`
6. Create PR with description

## Performance Monitoring

### Lighthouse

```bash
# Audit with Lighthouse
# In Chrome DevTools → Lighthouse tab
```

### Bundle Analysis

```bash
# Check bundle size
pnpm build
# View dist folder size
```

## Updates & Dependencies

### Update Dependencies

```bash
# Check for updates
pnpm outdated

# Update all
pnpm update
```

### Node Version

Use Node 18+ for best performance:

```bash
# With nvm
nvm use 18
```

## Support

For issues or questions:

1. Check [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
2. Check [API_REFERENCE.md](./API_REFERENCE.md)
3. Review existing issues
4. Create new issue with details

## Resources

- [Vite Documentation](https://vitejs.dev)
- [React 18 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://github.com/pmndrs/zustand)
