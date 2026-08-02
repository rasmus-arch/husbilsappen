import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { logbookApi, statsApi, tripsApi, vehicleApi } from '../api'
import { formatDate } from '../lib/date'
import { Card } from '../components/ui'

const shortcuts = [
  { to: '/resor', icon: '🧭', label: 'Resor' },
  { to: '/mer/vattenpass', icon: '📐', label: 'Vattenpass' },
  { to: '/mer/sos', icon: '🆘', label: 'Nödläge' },
  { to: '/mer/loggbok', icon: '📓', label: 'Loggbok' },
  { to: '/mer/instruktionsbok', icon: '📚', label: 'Instruktionsbok' },
  { to: '/skafferi', icon: '🧺', label: 'Skafferi' },
]

function SectionHeader({ title, linkTo, linkLabel }: { title: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</h3>
      {linkTo && (
        <Link to={linkTo} className="text-xs font-medium text-teal-700 dark:text-teal-400">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

export default function HomePage() {
  const { data: vehicle } = useQuery({ queryKey: ['vehicle'], queryFn: vehicleApi.get })
  const { data: trips } = useQuery({ queryKey: ['trips'], queryFn: tripsApi.list })
  const { data: logEntries } = useQuery({ queryKey: ['logbook'], queryFn: logbookApi.list })
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: statsApi.get })

  const latestLog = logEntries?.[0]
  const recentTrips = trips?.slice(0, 3) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Hej{vehicle?.registrationNumber ? `, ${vehicle.registrationNumber}` : ''}! 🚐
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {latestLog?.mileage != null
            ? `Senast loggade mätarställning: ${latestLog.mileage} km (${formatDate(latestLog.date)})`
            : 'Välkommen till Husbilsappen.'}
        </p>
      </div>

      <div>
        <SectionHeader title="Genvägar" />
        <div className="grid grid-cols-3 gap-2">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm hover:border-teal-600 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader title="Senaste resor" linkTo="/resor" linkLabel="Se alla" />
        {recentTrips.length === 0 ? (
          <Card className="text-center">
            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">Ingen resa planerad ännu.</p>
            <Link to="/resor" className="text-sm font-medium text-teal-700 dark:text-teal-400">
              + Skapa en resa
            </Link>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recentTrips.map((trip) => (
              <Link key={trip.id} to={`/resor/${trip.id}`}>
                <Card className="hover:border-teal-600">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{trip.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{trip.recipeCount} recept</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {stats && (stats.tripCount > 0 || stats.logEntryCount > 0) && (
        <div>
          <SectionHeader title="Statistik" linkTo="/mer/statistik" linkLabel="Se mer" />
          <div className="grid grid-cols-3 gap-2">
            <Card className="flex flex-col items-center gap-1 text-center">
              <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">{stats.tripCount}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Resor</span>
            </Card>
            <Card className="flex flex-col items-center gap-1 text-center">
              <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {stats.totalMileage !== null ? stats.totalMileage : '–'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Körda km</span>
            </Card>
            <Card className="flex flex-col items-center gap-1 text-center">
              <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {stats.avgConsumptionPer100Km !== null ? Math.round(stats.avgConsumptionPer100Km * 10) / 10 : '–'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">l/100km</span>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
