import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { vehicleApi } from '../api'
import type { VehicleDataInput } from '../api'
import { BackLink, Button, Card, Input, PageHeader } from '../components/ui'

function StatTile({ icon, label, value, unit }: { icon: string; label: string; value: number | null; unit: string }) {
  return (
    <Card className="flex flex-col items-center gap-1 text-center">
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {value !== null ? `${value} ${unit}` : '–'}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </Card>
  )
}

function ListRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between py-1.5 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-slate-900 dark:text-slate-100">{value || '–'}</span>
    </li>
  )
}

export default function VehicleDataPage() {
  const queryClient = useQueryClient()
  const { data: vehicle } = useQuery({ queryKey: ['vehicle'], queryFn: vehicleApi.get })
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<VehicleDataInput | null>(null)

  const updateMutation = useMutation({
    mutationFn: (data: VehicleDataInput) => vehicleApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle'] })
      setEditing(false)
    },
  })

  function startEdit() {
    if (!vehicle) return
    setForm({ ...vehicle })
    setEditing(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (form) updateMutation.mutate(form)
  }

  if (!vehicle) return <p className="text-slate-500">Laddar…</p>

  if (editing && form) {
    const numField = (key: keyof VehicleDataInput, label: string, placeholder?: string) => (
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <Input
          type="number"
          step="any"
          value={form[key] === null ? '' : (form[key] as number)}
          onChange={(e) => setForm({ ...form, [key]: e.target.value === '' ? null : Number(e.target.value) })}
          placeholder={placeholder}
        />
      </label>
    )

    return (
      <div>
        <BackLink />
        <PageHeader title="Husbilsdata" />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {numField('lengthM', 'Längd (m)')}
            {numField('widthM', 'Bredd (m)')}
            {numField('heightM', 'Höjd (m)')}
          </div>
          {numField('totalWeightKg', 'Totalvikt (kg)')}
          {numField('curbWeightKg', 'Tjänstevikt (kg)')}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Registreringsnummer</span>
            <Input
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
            />
          </label>
          {numField('waterTankL', 'Vattentank (liter)')}
          {numField('wasteWaterTankL', 'Gråvattentank (liter)')}
          {numField('wheelbaseM', 'Axelavstånd (m)', 'för vattenpassets klossförslag fram/bak')}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Övrigt</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              Spara
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Avbryt
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div>
      <BackLink />
      <PageHeader title="Husbilsdata" action={<Button onClick={startEdit}>Redigera</Button>} />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatTile icon="📏" label="Längd" value={vehicle.lengthM} unit="m" />
        <StatTile icon="↔" label="Bredd" value={vehicle.widthM} unit="m" />
        <StatTile icon="↕" label="Höjd" value={vehicle.heightM} unit="m" />
      </div>

      <Card>
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          <ListRow label="Totalvikt" value={vehicle.totalWeightKg !== null ? `${vehicle.totalWeightKg} kg` : ''} />
          <ListRow label="Tjänstevikt" value={vehicle.curbWeightKg !== null ? `${vehicle.curbWeightKg} kg` : ''} />
          <ListRow label="Registreringsnummer" value={vehicle.registrationNumber} />
          <ListRow label="Vattentank" value={vehicle.waterTankL !== null ? `${vehicle.waterTankL} liter` : ''} />
          <ListRow label="Gråvattentank" value={vehicle.wasteWaterTankL !== null ? `${vehicle.wasteWaterTankL} liter` : ''} />
          <ListRow label="Axelavstånd" value={vehicle.wheelbaseM !== null ? `${vehicle.wheelbaseM} m` : ''} />
        </ul>
      </Card>

      {vehicle.notes && (
        <Card className="mt-4">
          <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{vehicle.notes}</p>
        </Card>
      )}
    </div>
  )
}
