import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './services/query/client'
import { Dashboard } from './pages/Dashboard'
import './App.css'

/**
 * Root App Component
 * Provides TanStack Query context and renders Dashboard
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}

export default App
