import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { logbookApi } from '../api'
import { BackLink, EmptyState, PageHeader } from '../components/ui'
import { formatDate } from '../lib/date'

export default function GalleryPage() {
  const { data: entries } = useQuery({ queryKey: ['logbook'], queryFn: logbookApi.list })
  const [openUrl, setOpenUrl] = useState<string | null>(null)

  const withImages = entries?.filter((e) => e.imageUrl) ?? []

  return (
    <div>
      <BackLink />
      <PageHeader title="Bildgalleri" />

      {entries && withImages.length === 0 && <EmptyState>Inga bilder i loggboken ännu.</EmptyState>}

      <div className="grid grid-cols-3 gap-1.5">
        {withImages.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setOpenUrl(entry.imageUrl)}
            className="aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
          >
            <img src={entry.imageUrl!} alt={formatDate(entry.date)} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {openUrl && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenUrl(null)}
        >
          <img src={openUrl} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  )
}
