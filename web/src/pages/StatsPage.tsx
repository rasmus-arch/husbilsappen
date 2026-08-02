import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../api'
import { BackLink, Card, PageHeader } from '../components/ui'

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Card className="flex flex-col items-center gap-1 text-center">
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </Card>
  )
}

export default function StatsPage() {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: statsApi.get })

  if (!stats) return <p className="text-slate-500">Laddar…</p>

  return (
    <div>
      <BackLink />
      <PageHeader title="Resestatistik" />
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon="🧭" label="Resor" value={String(stats.tripCount)} />
        <StatCard icon="📓" label="Loggboksinlägg" value={String(stats.logEntryCount)} />
        <StatCard icon="🛣️" label="Körda km (loggade)" value={stats.totalMileage !== null ? String(stats.totalMileage) : '–'} />
        <StatCard
          icon="⛽"
          label="Snittförbrukning (l/100 km)"
          value={stats.avgConsumptionPer100Km !== null ? String(Math.round(stats.avgConsumptionPer100Km * 10) / 10) : '–'}
        />
      </div>

      {stats.mostUsedRecipe && (
        <Card className="mt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Mest använda recept</p>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {stats.mostUsedRecipe.name} ({stats.mostUsedRecipe.count} ggr)
          </p>
        </Card>
      )}
    </div>
  )
}
