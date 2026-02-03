'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { Wallet, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    console.log('🚀 Login button clicked!')
    e.preventDefault()
    setLoading(true)
    console.log('📧 Email:', email)
    console.log('🔑 Password:', password ? '***' : 'empty')

    try {
      console.log('🔐 Calling authApi.login...')
      console.log('📤 Request data:', { email, password: '***' })
      const response = await authApi.login({ email, password })
      console.log('✅ Login API successful!')
      console.log('📥 Response:', response)
      console.log('🎫 Token received:', response.access_token ? response.access_token.substring(0, 20) + '...' : 'MISSING')
      console.log('👤 User received:', response.user)
      
      setAuth(response.user, response.access_token)
      console.log('💾 setAuth called, checking localStorage...')
      
      // Wait a bit for state to update
      setTimeout(() => {
        console.log('📦 localStorage after setAuth:', localStorage.getItem('auth_token') ? 'EXISTS' : 'MISSING')
        console.log('🔐 isAuthenticated check:', useAuthStore.getState().isAuthenticated())
        
        toast.success('Welcome back!')
        
        // Only redirect if authentication is confirmed
        if (localStorage.getItem('auth_token')) {
          console.log('🔄 Redirecting to dashboard')
          router.push('/dashboard')
        } else {
          console.error('❌ Token not found in localStorage after setAuth')
          toast.error('Login failed - please try again')
          setLoading(false)
        }
      }, 200)
    } catch (error: any) {
      console.error('❌ Login error:', error)
      console.error('❌ Error response:', error.response?.data)
      toast.error(error.response?.data?.detail || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-base">
            Sign in to manage your finances
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full h-11 text-base" 
              disabled={loading}
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
