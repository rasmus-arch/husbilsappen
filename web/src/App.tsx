import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, setUnauthorizedHandler } from './api'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import RecipesPage from './pages/RecipesPage'
import RecipeEditPage from './pages/RecipeEditPage'
import InventoryPage from './pages/InventoryPage'
import TripsPage from './pages/TripsPage'
import TripDetailPage from './pages/TripDetailPage'
import ListsPage from './pages/ListsPage'
import ListDetailPage from './pages/ListDetailPage'
import LogbookPage from './pages/LogbookPage'
import PublicLogbookPage from './pages/PublicLogbookPage'
import MorePage from './pages/MorePage'
import GalleryPage from './pages/GalleryPage'
import VehicleDataPage from './pages/VehicleDataPage'
import ServicePage from './pages/ServicePage'
import FuelPage from './pages/FuelPage'
import PlacesPage from './pages/PlacesPage'
import ContactsPage from './pages/ContactsPage'
import StatsPage from './pages/StatsPage'
import LevelPage from './pages/LevelPage'
import ManualsPage from './pages/ManualsPage'
import SosPage from './pages/SosPage'
import { Button } from './components/ui'

const navItems = [
  { to: '/', label: 'Hem', end: true },
  { to: '/resor', label: 'Resor' },
  { to: '/recept', label: 'Recept' },
  { to: '/skafferi', label: 'Skafferi' },
  { to: '/listor', label: 'Listor' },
  { to: '/mer', label: 'Mer' },
]

function AuthenticatedApp() {
  const queryClient = useQueryClient()
  const meQuery = useQuery({ queryKey: ['me'], queryFn: authApi.me })

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(['me'], { authenticated: false })
    })
  }, [queryClient])

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], { authenticated: false })
      queryClient.clear()
    },
  })

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-slate-500">
        Laddar…
      </div>
    )
  }

  if (!meQuery.data?.authenticated) {
    return <LoginPage />
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col bg-slate-50 pb-20 dark:bg-slate-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <h1 className="text-lg font-semibold text-teal-700 dark:text-teal-400">🚐 Husbilsappen</h1>
        <Button variant="ghost" onClick={() => logoutMutation.mutate()}>
          Logga ut
        </Button>
      </header>

      <main className="flex-1 px-4 py-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/resor" element={<TripsPage />} />
          <Route path="/resor/:tripId" element={<TripDetailPage />} />
          <Route path="/recept" element={<RecipesPage />} />
          <Route path="/recept/nytt" element={<RecipeEditPage />} />
          <Route path="/recept/:recipeId" element={<RecipeEditPage />} />
          <Route path="/skafferi" element={<InventoryPage />} />
          <Route path="/listor" element={<ListsPage />} />
          <Route path="/listor/:listId" element={<ListDetailPage />} />
          <Route path="/mer" element={<MorePage />} />
          <Route path="/mer/loggbok" element={<LogbookPage />} />
          <Route path="/mer/galleri" element={<GalleryPage />} />
          <Route path="/mer/husbilsdata" element={<VehicleDataPage />} />
          <Route path="/mer/servicelogg" element={<ServicePage />} />
          <Route path="/mer/bransle" element={<FuelPage />} />
          <Route path="/mer/platser" element={<PlacesPage />} />
          <Route path="/mer/nodkontakter" element={<ContactsPage />} />
          <Route path="/mer/statistik" element={<StatsPage />} />
          <Route path="/mer/vattenpass" element={<LevelPage />} />
          <Route path="/mer/instruktionsbok" element={<ManualsPage />} />
          <Route path="/mer/sos" element={<SosPage />} />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-2xl border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                isActive
                  ? 'text-teal-700 dark:text-teal-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/dela/:token" element={<PublicLogbookPage />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </HashRouter>
  )
}

export default App
