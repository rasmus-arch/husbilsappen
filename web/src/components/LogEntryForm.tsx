import { useState } from 'react'
import type { FormEvent } from 'react'
import type { LogEntryInput } from '../api'
import { Button, Input } from './ui'

function today() {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  initial?: { date: string; mileage: number | null; note: string }
  onSubmit: (data: LogEntryInput) => void
  onCancel?: () => void
  submitLabel: string
  pending?: boolean
}

export default function LogEntryForm({ initial, onSubmit, onCancel, submitLabel, pending }: Props) {
  const [date, setDate] = useState(initial?.date ?? today())
  const [mileage, setMileage] = useState(initial?.mileage != null ? String(initial.mileage) : '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [image, setImage] = useState<File | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({ date, mileage: mileage === '' ? null : Number(mileage), note, image })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Datum</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Miltal</span>
          <Input
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="mil"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Bild</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          className="text-sm text-slate-600 dark:text-slate-400"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Om dagen</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Vad hände idag?"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Avbryt
          </Button>
        )}
      </div>
    </form>
  )
}
