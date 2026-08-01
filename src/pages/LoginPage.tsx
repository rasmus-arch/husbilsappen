import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api'
import { Button, Card, Input } from '../components/ui'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(password),
    onSuccess: () => {
      queryClient.setQueryData(['me'], { authenticated: true })
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-xl font-semibold text-teal-700 dark:text-teal-400">
          🚐 Husbilsappen
        </h1>
        <p className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">Ange lösenord för att fortsätta</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Lösenord"
            autoFocus
          />
          {loginMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">{(loginMutation.error as Error).message}</p>
          )}
          <Button type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Loggar in…' : 'Logga in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
