import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tripsApi } from '../api'
import { Button, Card, EmptyState, Input, PageHeader } from '../components/ui'

export default function TripsPage() {
  const { data: trips } = useQuery({ queryKey: ['trips'], queryFn: tripsApi.list })
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () => tripsApi.create(name.trim() || 'Ny resa'),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      setName('')
      navigate(`/resor/${trip.id}`)
    },
  })

  return (
    <div>
      <PageHeader title="Resor" />

      <Card className="mb-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Namn på resa, t.ex. Sommarresa 2026"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && createMutation.mutate()}
          />
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            Skapa
          </Button>
        </div>
      </Card>

      {trips && trips.length === 0 && (
        <EmptyState>Ingen resa planerad ännu. Skapa en resa och välj recept för att räkna ut vad som behöver handlas.</EmptyState>
      )}

      <div className="flex flex-col gap-2">
        {trips?.map((trip) => (
          <Link key={trip.id} to={`/resor/${trip.id}`}>
            <Card className="hover:border-teal-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900 dark:text-slate-100">{trip.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {trip.recipeCount} recept
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
