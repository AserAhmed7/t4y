import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './lib/ctx'
import { Layout, Loading } from './components/ui'
import * as P from './pages/Public'
import Auth from './pages/Auth'
import Portal from './pages/Portal'
const Admin = lazy(() => import('./pages/Admin')) // admin code is a separate chunk, never loaded for public users

function Guard({ role, children }) {
  const { ready, session, profile } = useApp()
  if (!ready) return <Loading />
  if (!session) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace />
  if (role === 'admin' && profile?.role !== 'admin') return <Navigate to="/" replace />
  return children
}
export default function App() {
  return <Routes>
    <Route element={<Layout />}>
      <Route index element={<P.Home />} />
      <Route path="services" element={<P.Services />} />
      <Route path="pricing" element={<P.Pricing />} />
      <Route path="portfolio" element={<P.Portfolio />} />
      <Route path="portfolio/:id" element={<P.ProjectDetails />} />
      <Route path="about" element={<P.About />} />
      <Route path="contact" element={<P.Contact />} />
      <Route path="request" element={<P.Request />} />
      <Route path="login" element={<Auth />} />
      <Route path="register" element={<Auth mode="register" />} />
      <Route path="admin/login" element={<Auth admin />} />
      <Route path="portal/*" element={<Guard><Portal /></Guard>} />
      <Route path="admin/*" element={<Guard role="admin"><Suspense fallback={<Loading />}><Admin /></Suspense></Guard>} />
    </Route>
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
}
