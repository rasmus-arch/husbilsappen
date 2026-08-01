import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../api'
import { Card, EmptyState } from '../components/ui'
import { formatDate } from '../lib/date'

export default function PublicLogbookPage() {
  const { token } = useParams()
  const {
    data: entries,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['public-logbook', token],
    queryFn: () => publicApi.logbook(token!),
    retry: false,
  })

  return (
    <div className="mx-auto min-h-svh max-w-2xl bg-slate-50 px-4 py-4 dark:bg-slate-950">
      <header className="mb-4">
        <h1 className="text-lg font-semibold text-teal-700 dark:text-teal-400">🚐 Husbilsappen – Loggbok</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Delad, skrivskyddad vy</p>
      </header>

      {isLoading && <p className="text-slate-500">Laddar…</p>}
      {isError && <EmptyState>Länken är ogiltig eller har återkallats.</EmptyState>}
      {entries && entries.length === 0 && <EmptyState>Inga loggposter ännu.</EmptyState>}

      <div className="flex flex-col gap-3 pb-8">
        {entries?.map((entry) => (
          <Card key={entry.id}>
            {entry.imageUrl && (
              <img src={entry.imageUrl} alt="" className="mb-3 w-full rounded-lg object-cover" />
            )}
            <div className="mb-1 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>{formatDate(entry.date)}</span>
              {entry.mileage !== null && <span>{entry.mileage} mil</span>}
            </div>
            {entry.note && (
              <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{entry.note}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
