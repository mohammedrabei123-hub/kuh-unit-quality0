import { lazy, Suspense, type JSX } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './auth/AuthProvider'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Placeholder from './pages/Placeholder'
import { Skeleton } from './components/ui'
import { envMissing } from './lib/supabase'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Departments = lazy(() => import('./pages/Departments'))
const DepartmentDetail = lazy(() => import('./pages/DepartmentDetail'))
const Assessments = lazy(() => import('./pages/Assessments'))
const AssessmentForm = lazy(() => import('./pages/AssessmentForm'))
const Reports = lazy(() => import('./pages/Reports'))
const Admin = lazy(() => import('./pages/Admin'))
const page = (el: JSX.Element) => <Suspense fallback={<Skeleton className="h-64" />}>{el}</Suspense>
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

export default function App() {
  if (envMissing)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center" dir="ltr">
        <p>Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — add them in Vercel → Settings → Environment Variables, then redeploy.</p>
      </div>
    )
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route index element={page(<Dashboard />)} />
                <Route path="departments" element={page(<Departments />)} />
                <Route path="departments/:id" element={page(<DepartmentDetail />)} />
                <Route path="assessments" element={page(<Assessments />)} />
                <Route path="assessments/new" element={page(<AssessmentForm />)} />
                <Route path="assessments/:id" element={page(<AssessmentForm />)} />
                <Route path="reports" element={page(<Reports />)} />
                <Route path="admin" element={page(<Admin />)} />
                <Route path="*" element={<Placeholder name="الصفحة غير موجودة" />} />
              </Route>
            </Route>
          </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
