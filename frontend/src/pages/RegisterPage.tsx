import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/auth.service'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function RegisterPage() {
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) { addToast('error', 'Please fill in all fields'); return }
    if (password.length < 6) { addToast('error', 'Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const res = await register(name, email, password)
      authLogin(res)
      addToast('success', 'Account created!')
      navigate('/dashboard')
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-100 font-[Outfit]">Create Account</h2>
        <p className="mt-1 text-sm text-gray-400">Start your financial journey today</p>
      </div>
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
      <Button type="submit" loading={loading} className="w-full">Create Account</Button>
      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-[#A29BFE] hover:text-[#6C5CE7] transition-colors">Sign in</Link>
      </p>
    </form>
  )
}
