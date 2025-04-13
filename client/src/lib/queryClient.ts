import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 全局查询默认选项
      retry: 1,
      staleTime: 30000, // 30 秒
      refetchOnWindowFocus: false,
      // 当查询失败时的默认行为
      onError: (err) => {
        console.error('Query error:', err);
      }
    },
    mutations: {
      // 全局变化默认选项
      retry: 0,
      // 当变化失败时的默认行为
      onError: (err) => {
        console.error('Mutation error:', err);
      }
    }
  }
});
