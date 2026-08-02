import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'

const items = [
  { to: '/mer/loggbok', icon: '📓', label: 'Loggbok' },
  { to: '/mer/galleri', icon: '🖼️', label: 'Bildgalleri' },
  { to: '/mer/husbilsdata', icon: '🚐', label: 'Husbilsdata' },
  { to: '/mer/servicelogg', icon: '🔧', label: 'Servicelogg' },
  { to: '/mer/bransle', icon: '⛽', label: 'Bränslelogg' },
  { to: '/mer/platser', icon: '📍', label: 'Platser' },
  { to: '/mer/nodkontakter', icon: '☎️', label: 'Nödkontakter' },
  { to: '/mer/statistik', icon: '📊', label: 'Resestatistik' },
]

export default function MorePage() {
  return (
    <div>
      <PageHeader title="Mer" />
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm hover:border-teal-600 dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="text-3xl">{item.icon}</span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
