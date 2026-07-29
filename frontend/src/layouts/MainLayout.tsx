import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Sidebar } from '../components/layout/Sidebar'
import { Navbar } from '../components/layout/Navbar'

export function MainLayout() {
  const { isAuthenticated } = useAuth()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0B1E] mesh-bg">
      {(isDesktop || sidebarOpen) && (
        <>
          <div
            className={`${isDesktop ? 'hidden lg:block' : 'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden'}`}
            onClick={() => setSidebarOpen(false)}
          />
          <div className={`${isDesktop ? 'relative' : 'fixed left-0 top-0 z-50'} h-full`}>
            <Sidebar />
          </div>
        </>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
