import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { vehicleApi } from '../api'
import { bestBlockLevel, wheelLifts } from '../lib/levelBlocks'
import type { BlockLevel, WheelLifts } from '../lib/levelBlocks'
import { BackLink, Card, Button, PageHeader } from '../components/ui'

type PermissionState = 'unknown' | 'not-needed' | 'granted' | 'denied' | 'unsupported'

const TOLERANCE_DEG = 1.5
const MAX_DEG = 20

function levelLabel(level: BlockLevel): string {
  if (level.count === 0) return 'Plant'
  return `${level.totalCm} cm (${level.count} kloss${level.count > 1 ? 'ar' : ''})`
}

function WheelDiagram({ lifts }: { lifts: WheelLifts }) {
  const fl = bestBlockLevel(lifts.fl)
  const fr = bestBlockLevel(lifts.fr)
  const rl = bestBlockLevel(lifts.rl)
  const rr = bestBlockLevel(lifts.rr)

  const wheelFill = (count: number) => (count === 0 ? 'fill-teal-600' : 'fill-amber-500')
  const wheelText = (level: BlockLevel) => (level.count === 0 ? '–' : `${level.totalCm} cm`)

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 280 320" className="h-72 w-56">
        <text x="140" y="12" textAnchor="middle" className="fill-slate-400 text-[11px]">
          Fram
        </text>
        <rect
          x="80"
          y="20"
          width="120"
          height="280"
          rx="24"
          className="fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600"
          strokeWidth="2"
        />
        <rect x="58" y="50" width="20" height="46" rx="6" className={wheelFill(fl.count)} />
        <rect x="202" y="50" width="20" height="46" rx="6" className={wheelFill(fr.count)} />
        <rect x="58" y="224" width="20" height="46" rx="6" className={wheelFill(rl.count)} />
        <rect x="202" y="224" width="20" height="46" rx="6" className={wheelFill(rr.count)} />
        <text x="50" y="76" textAnchor="end" className="fill-slate-700 text-[13px] font-medium dark:fill-slate-300">
          {wheelText(fl)}
        </text>
        <text x="230" y="76" textAnchor="start" className="fill-slate-700 text-[13px] font-medium dark:fill-slate-300">
          {wheelText(fr)}
        </text>
        <text x="50" y="250" textAnchor="end" className="fill-slate-700 text-[13px] font-medium dark:fill-slate-300">
          {wheelText(rl)}
        </text>
        <text x="230" y="250" textAnchor="start" className="fill-slate-700 text-[13px] font-medium dark:fill-slate-300">
          {wheelText(rr)}
        </text>
        <text x="140" y="312" textAnchor="middle" className="fill-slate-400 text-[11px]">
          Bak
        </text>
      </svg>

      <ul className="w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
        <li className="flex justify-between py-1.5">
          <span className="text-slate-500 dark:text-slate-400">Fram vänster</span>
          <span className="text-slate-900 dark:text-slate-100">{levelLabel(fl)}</span>
        </li>
        <li className="flex justify-between py-1.5">
          <span className="text-slate-500 dark:text-slate-400">Fram höger</span>
          <span className="text-slate-900 dark:text-slate-100">{levelLabel(fr)}</span>
        </li>
        <li className="flex justify-between py-1.5">
          <span className="text-slate-500 dark:text-slate-400">Bak vänster</span>
          <span className="text-slate-900 dark:text-slate-100">{levelLabel(rl)}</span>
        </li>
        <li className="flex justify-between py-1.5">
          <span className="text-slate-500 dark:text-slate-400">Bak höger</span>
          <span className="text-slate-900 dark:text-slate-100">{levelLabel(rr)}</span>
        </li>
      </ul>
    </div>
  )
}

export default function LevelPage() {
  const { data: vehicle } = useQuery({ queryKey: ['vehicle'], queryFn: vehicleApi.get })
  const [permission, setPermission] = useState<PermissionState>('unknown')
  const [beta, setBeta] = useState<number | null>(null)
  const [gamma, setGamma] = useState<number | null>(null)
  const offset = useRef({ beta: 0, gamma: 0 })
  const [, forceRerender] = useState(0)

  useEffect(() => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermission('unsupported')
      return
    }

    function handleOrientation(e: DeviceOrientationEvent) {
      setBeta(e.beta)
      setGamma(e.gamma)
    }

    const requestFn = (
      DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> }
    ).requestPermission

    if (typeof requestFn !== 'function') {
      // Android/desktop: inget explicit tillstånd behövs
      setPermission('not-needed')
      window.addEventListener('deviceorientation', handleOrientation)
      return () => window.removeEventListener('deviceorientation', handleOrientation)
    }

    // iOS: väntar på att användaren trycker på knappen nedan
    if (permission === 'granted') {
      window.addEventListener('deviceorientation', handleOrientation)
      return () => window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [permission])

  async function requestIosPermission() {
    const requestFn = (
      DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> }
    ).requestPermission
    if (typeof requestFn !== 'function') return
    try {
      const result = await requestFn()
      setPermission(result === 'granted' ? 'granted' : 'denied')
    } catch {
      setPermission('denied')
    }
  }

  function calibrate() {
    if (beta === null || gamma === null) return
    offset.current = { beta, gamma }
    forceRerender((n) => n + 1)
  }

  const adjBeta = beta !== null ? beta - offset.current.beta : null
  const adjGamma = gamma !== null ? gamma - offset.current.gamma : null
  const isLevel = adjBeta !== null && adjGamma !== null && Math.abs(adjBeta) < TOLERANCE_DEG && Math.abs(adjGamma) < TOLERANCE_DEG

  const clamp = (n: number) => Math.max(-MAX_DEG, Math.min(MAX_DEG, n))
  const dotX = adjGamma !== null ? (clamp(adjGamma) / MAX_DEG) * 45 : 0
  const dotY = adjBeta !== null ? (clamp(adjBeta) / MAX_DEG) * 45 : 0

  return (
    <div>
      <BackLink />
      <PageHeader title="Vattenpass" />

      {permission === 'unsupported' && (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Din webbläsare stödjer inte lägesavkänning (DeviceOrientation). Prova en annan mobil webbläsare.
          </p>
        </Card>
      )}

      {permission === 'denied' && (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Åtkomst till rörelsesensorer nekades. Tillåt det i webbläsarens inställningar och ladda om sidan.
          </p>
        </Card>
      )}

      {permission === 'unknown' && (
        <Card className="text-center">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Lägg mobilen plant (skärmen upp) på ett bord eller golv i husbilen, med toppen av mobilen mot fronten på husbilen.
          </p>
          <Button onClick={requestIosPermission}>Aktivera vattenpass</Button>
        </Card>
      )}

      {(permission === 'granted' || permission === 'not-needed') && (
        <div className="flex flex-col items-center gap-4">
          <div
            className={`relative flex h-64 w-64 items-center justify-center rounded-full border-4 ${
              isLevel ? 'border-teal-600' : 'border-slate-300 dark:border-slate-700'
            } bg-white dark:bg-slate-900`}
          >
            <div className="absolute h-px w-full bg-slate-200 dark:bg-slate-800" />
            <div className="absolute h-full w-px bg-slate-200 dark:bg-slate-800" />
            <span className="absolute top-1 text-xs text-slate-400">Fram</span>
            <span className="absolute bottom-1 text-xs text-slate-400">Bak</span>
            <div
              className={`absolute h-10 w-10 rounded-full transition-colors ${
                isLevel ? 'bg-teal-600' : 'bg-amber-500'
              }`}
              style={{ transform: `translate(${dotX * 4}px, ${dotY * 4}px)` }}
            />
          </div>

          <Card className="w-full text-center">
            <p className="text-sm text-slate-900 dark:text-slate-100">
              Sida till sida: <span className="font-semibold">{adjGamma !== null ? adjGamma.toFixed(1) : '–'}°</span>
            </p>
            <p className="text-sm text-slate-900 dark:text-slate-100">
              Fram till bak: <span className="font-semibold">{adjBeta !== null ? adjBeta.toFixed(1) : '–'}°</span>
            </p>
            {isLevel && <p className="mt-1 text-sm font-medium text-teal-700 dark:text-teal-400">✅ Plant</p>}
          </Card>

          {!isLevel && adjGamma !== null && adjBeta !== null && (
            <Card className="w-full">
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Klossförslag per hjul</p>
              {vehicle?.widthM == null || vehicle?.wheelbaseM == null ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fyll i {[vehicle?.widthM == null && 'bredd', vehicle?.wheelbaseM == null && 'axelavstånd'].filter(Boolean).join(' och ')}{' '}
                  under Husbilsdata för att få klossförslag per hjul.
                </p>
              ) : (
                <WheelDiagram lifts={wheelLifts(adjGamma, adjBeta, vehicle.widthM, vehicle.wheelbaseM)} />
              )}
            </Card>
          )}

          <Button variant="secondary" onClick={calibrate}>
            Nollställ här (kalibrera)
          </Button>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Lägg mobilen på ett känt plant underlag och tryck "Nollställ" om den visar fel även när det är plant. Kontrollera
            håll (vänster/höger, fram/bak) mot ögonmått första gången du använder klossförslaget.
          </p>
        </div>
      )}
    </div>
  )
}
