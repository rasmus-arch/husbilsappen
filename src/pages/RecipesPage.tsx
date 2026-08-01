import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { recipesApi } from '../api'
import { Button, Card, EmptyState, PageHeader } from '../components/ui'

export default function RecipesPage() {
  const { data: recipes } = useQuery({ queryKey: ['recipes'], queryFn: recipesApi.list })

  return (
    <div>
      <PageHeader
        title="Recept"
        action={
          <Link to="/recept/nytt">
            <Button>+ Nytt recept</Button>
          </Link>
        }
      />

      {recipes && recipes.length === 0 && <EmptyState>Inga recept ännu. Lägg till ditt första!</EmptyState>}

      <div className="flex flex-col gap-2">
        {recipes?.map((recipe) => (
          <Link key={recipe.id} to={`/recept/${recipe.id}`}>
            <Card className="hover:border-teal-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900 dark:text-slate-100">{recipe.name || 'Namnlöst recept'}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{recipe.servings} port.</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {recipe.ingredients.length} ingrediens{recipe.ingredients.length === 1 ? '' : 'er'}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
