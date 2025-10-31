import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { CryptoList } from "./components/CryptoList";
import { WatchlistView } from "./components/WatchlistView";
import { KLineChart } from "./components/KLineChart";
import type { Cryptocurrency } from "./types/index";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const [selectedCrypto, setSelectedCrypto] = useState<Cryptocurrency | null>(
    null,
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>加密貨幣即時行情</h1>
        <ConnectionStatus />
      </header>

      <div className="app-container">
        <CryptoList onSelectCrypto={setSelectedCrypto} />
        <WatchlistView onSelectCrypto={setSelectedCrypto} />
      </div>

      {selectedCrypto && (
        <KLineChart
          crypto={selectedCrypto}
          onClose={() => setSelectedCrypto(null)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
