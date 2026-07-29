import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/auth.service'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function LoginPage() {
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { addToast('error', 'Please fill in all fields'); return }
    setLoading(true)
    try {
      const res = await login(email, password)
      authLogin(res)
      addToast('success', 'Welcome back!')
      navigate('/dashboard')
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-100 font-[Outfit]">Welcome Back</h2>
        <p className="mt-1 text-sm text-gray-400">Sign in to your financial dashboard</p>
      </div>
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      <Button type="submit" loading={loading} className="w-full">Sign In</Button>
      <p className="text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">Sign up</Link>
      </p>
    </form>
  )
}
