// ============================================================
// main.tsx — App တစ်ခုလုံးရဲ့ စတင်ရာနေရာ (entry point)
// Browser က index.html ကို load လုပ်ပြီးတာနဲ့ ဒီဖိုင်က စရွေ့ပါတယ်။
// ============================================================

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { AuthProvider } from './auth/AuthContext'
import { BagProvider } from './cart/BagProvider'
import './index.css'
import { ApiError } from './lib/api'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime: dataကို 30sec အတွင်းcacheထဲကပဲပြန်ပေး။
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => count < 1 && !(err instanceof ApiError && err.status >= 400 && err.status < 500),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BagProvider>
          <RouterProvider router={router} />
        </BagProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
