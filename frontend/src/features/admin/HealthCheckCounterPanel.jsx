import { useEffect, useState } from 'react'
import { MapPin, Pencil, RotateCcw, Smartphone } from 'lucide-react'
import { Panel, PanelHeader } from '../design/Surfaces.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import {
  getHealthCheckCountRequest,
  resetHealthChecksTodayRequest,
} from './admin-api.js'
import { BoothSettingsDialog } from './BoothSettingsDialog.jsx'
import { boothLabel } from '../../content/site-info.js'
import { useSiteSettings } from '../../lib/site-settings.js'

/**
 * The booth's "phones checked today" counter, with a reset for fair morning:
 * the team tests its own phones while setting up, then zeroes the count so the
 * booth screen starts honest. It only clears today; it resets itself at
 * midnight Manila time anyway.
 *
 * It also holds the booth number, which the organisers may only announce on
 * fair day: "Edit booth" changes it everywhere the site shows it.
 */
export function HealthCheckCounterPanel() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [isResetting, setIsResetting] = useState(false)
  const [isEditingBooth, setIsEditingBooth] = useState(false)
  const settings = useSiteSettings()

  useEffect(() => {
    const controller = new AbortController()
    getHealthCheckCountRequest(controller.signal)
      .then((data) => setStats(data.stats))
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught)
      })
    return () => controller.abort()
  }, [])

  async function handleReset() {
    if (!window.confirm("Reset today's phone check count to 0?")) return
    setIsResetting(true)
    try {
      const data = await resetHealthChecksTodayRequest()
      setStats(data.stats)
      toast.success('Counter reset', {
        description: 'The booth screen shows 0 within 30 seconds.',
      })
    } catch (caught) {
      toast.error("Couldn't reset the counter", { description: caught.message })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Panel className="mt-6" data-testid="admin-health-checks">
      <PanelHeader
        kicker="Techno Fair booth"
        title="Phones checked today"
        description="The count and booth number on the booth screen. Reset the count after testing your setup."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingBooth(true)}
              data-testid="edit-booth-settings"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit booth
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              loading={isResetting}
              disabled={!stats || stats.today === 0}
              data-testid="reset-health-checks"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset today&rsquo;s count
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        {error ? (
          <p className="text-sm text-muted" role="alert">
            The counter could not load: {error.message}
          </p>
        ) : !stats ? (
          <div role="status" aria-label="Loading phone check count">
            <Skeleton className="h-10 w-40" />
          </div>
        ) : (
          <p className="flex items-center gap-3 text-sm text-muted">
            <Smartphone className="size-5 text-accent" aria-hidden="true" />
            <span>
              <span className="font-display text-2xl font-bold text-ink">{stats.today}</span>{' '}
              today · {stats.total} all time
            </span>
          </p>
        )}
        <p className="flex items-center gap-2 text-sm text-muted" data-testid="admin-booth-label">
          <MapPin className="size-4 text-accent" aria-hidden="true" />
          {boothLabel(settings.booth)}
          <span className="text-subtle">· Viber {settings.viber ? 'link set' : 'coming soon'}</span>
        </p>
      </div>
      <BoothSettingsDialog
        open={isEditingBooth}
        settings={settings}
        onClose={() => setIsEditingBooth(false)}
        onSaved={(saved) => {
          setIsEditingBooth(false)
          toast.success('Booth settings saved', {
            description: `The site now shows ${boothLabel(saved.booth ?? settings.booth)}. The kiosk updates within a minute.`,
          })
        }}
      />
    </Panel>
  )
}
