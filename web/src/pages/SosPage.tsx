import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { contactsApi, geocodeApi, vehicleApi } from '../api'
import { BackLink, Button, Card, PageHeader } from '../components/ui'

interface Position {
  lat: number
  lon: number
  accuracy: number
}

export default function SosPage() {
  const { data: vehicle } = useQuery({ queryKey: ['vehicle'], queryFn: vehicleApi.get })
  const { data: contacts } = useQuery({ queryKey: ['contacts'], queryFn: contactsApi.list })

  const [position, setPosition] = useState<Position | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [copied, setCopied] = useState(false)

  function getPosition() {
    if (!navigator.geolocation) {
      setStatus('error')
      return
    }
    setStatus('loading')
    setAddress(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }
        setPosition(next)
        setStatus('idle')
        try {
          const result = await geocodeApi.reverse(next.lat, next.lon)
          setAddress(result.address)
        } catch {
          // Adressuppslag är extra info - inget krav för att SOS-sidan ska fungera
        }
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const coordsText = position ? `${position.lat.toFixed(5)}, ${position.lon.toFixed(5)}` : ''
  const mapsUrl = position ? `https://maps.google.com/?q=${position.lat},${position.lon}` : ''

  function copyCoords() {
    if (!coordsText) return
    navigator.clipboard.writeText(coordsText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function share() {
    if (!position) return
    const text = `Min position: ${coordsText}${address ? `\n${address}` : ''}\n${mapsUrl}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // avbrutet av användaren, inget att göra
      }
    } else {
      copyCoords()
    }
  }

  return (
    <div>
      <BackLink />
      <PageHeader title="🆘 Nödläge" />

      <Card className="mb-4">
        <Button onClick={getPosition} disabled={status === 'loading'} className="w-full">
          {status === 'loading' ? 'Hämtar position…' : '📍 Hämta min position'}
        </Button>
        {status === 'error' && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            Kunde inte hämta position. Tillåt platsåtkomst i webbläsaren och försök igen.
          </p>
        )}
        {position && (
          <div className="mt-3">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{coordsText}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Noggrannhet: ±{Math.round(position.accuracy)} m</p>
            {address && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{address}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary" type="button">
                  Öppna i kartor
                </Button>
              </a>
              <Button variant="secondary" onClick={copyCoords} type="button">
                {copied ? 'Kopierat!' : 'Kopiera'}
              </Button>
              <Button onClick={share} type="button">
                Dela position
              </Button>
            </div>
          </div>
        )}
      </Card>

      {vehicle?.registrationNumber && (
        <Card className="mb-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Registreringsnummer</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{vehicle.registrationNumber}</p>
        </Card>
      )}

      {contacts && contacts.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Nödkontakter</h3>
          <div className="flex flex-col gap-2">
            {contacts.map((contact) => (
              <Card key={contact.id} className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{contact.name}</span>
                  {contact.category && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{contact.category}</span>
                  )}
                </div>
                {contact.phone && (
                  <a href={`tel:${contact.phone}`}>
                    <Button type="button">📞 Ring</Button>
                  </a>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
