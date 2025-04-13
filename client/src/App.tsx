import { Route, Switch } from 'wouter';
import { Suspense, lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// Lazy load pages for better performance
const ChatPage = lazy(() => import('./pages/ChatPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="loading">加载中...</div>}>
        <Switch>
          <Route path="/" component={ChatPage} />
          <Route path="/status" component={StatusPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </Suspense>
    </QueryClientProvider>
  );
}

export default App;