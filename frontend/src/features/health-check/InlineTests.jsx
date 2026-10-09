import { useEffect, useRef, useState } from 'react'
import { Camera, Mic, RefreshCw, Volume2 } from 'lucide-react'
import { Button } from '../../components/ui/Button.jsx'

/**
 * The tests that run inside the page.
 *
 * Every one reports through `onResult(status, note)`. A permission the visitor
 * refuses is `blocked`, not `failed`: it says nothing about the hardware. Every
 * stream and listener is released on unmount, so leaving a test half-way never
 * leaves the camera light or the microphone on.
 */

/** A question with a yes/no pair, used wherever only the visitor can judge. */
function Ask({ question, yes = 'Yes', no = 'No', onYes, onNo, children }) {
  return (
    <div className="rounded-card border border-line bg-panel p-4">
      <p className="text-sm font-semibold text-ink">{question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="brand" onClick={onYes}>
          {yes}
        </Button>
        <Button size="sm" variant="secondary" onClick={onNo}>
          {no}
        </Button>
        {children}
      </div>
    </div>
  )
}

function isPermissionError(error) {
  return error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
}

function Meter({ value, label }) {
  return (
    <div>
      <div
        className="h-3 overflow-hidden rounded-pill bg-well"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
      >
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-100"
          style={{ width: `${Math.min(100, Math.round(value * 100))}%` }}
        />
      </div>
    </div>
  )
}

/** Three rising tones, so "I heard something" can be checked against a count. */
const TONES = [440, 660, 880]
const TONE_SECONDS = 0.35

export function SpeakerTest({ onResult }) {
  const contextRef = useRef(null)
  const [played, setPlayed] = useState(false)

  useEffect(() => () => contextRef.current?.close().catch(() => {}), [])

  function play() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const context = contextRef.current ?? new AudioContextClass()
    contextRef.current = context
    context.resume?.()

    TONES.forEach((frequency, index) => {
      const start = context.currentTime + index * (TONE_SECONDS + 0.12)
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + TONE_SECONDS)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + TONE_SECONDS + 0.02)
    })

    setPlayed(true)
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Turn the volume up and take headphones out, so the sound comes from the phone itself.
      </p>
      <div>
        <Button variant={played ? 'secondary' : 'primary'} onClick={play}>
          <Volume2 className="size-4" aria-hidden="true" />
          {played ? 'Play again' : 'Play three tones'}
        </Button>
      </div>
      {played && (
        <Ask
          question="Did you hear three clear tones, rising in pitch?"
          yes="Yes, clearly"
          no="No, or they crackled"
          onYes={() => onResult('passed')}
          onNo={() => onResult('failed', 'Tones missing, quiet or distorted')}
        />
      )}
    </div>
  )
}

/** Level, 0–1, a voice has to reach for the test to count it as heard. */
const VOICE_THRESHOLD = 0.12
/**
 * Frames above that level, in total, before the test passes — about a fifth of a
 * second of sound. Counted cumulatively rather than in a row, because speech
 * has gaps between syllables and a strict run kept missing real voices.
 */
const VOICE_FRAMES = 12
const LISTEN_SECONDS = 15

export function MicrophoneTest({ onResult }) {
  const [level, setLevel] = useState(0)
  const [state, setState] = useState('idle')
  const cleanupRef = useRef(() => {})

  useEffect(() => () => cleanupRef.current(), [])

  async function start() {
    setState('starting')

    let stream

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      onResult(isPermissionError(error) ? 'blocked' : 'failed', error?.message)
      return
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const context = new AudioContextClass()
    const analyser = context.createAnalyser()
    analyser.fftSize = 1024
    context.createMediaStreamSource(stream).connect(analyser)

    const samples = new Float32Array(analyser.fftSize)
    const startedAt = performance.now()
    let peak = 0
    let loudFrames = 0
    let frame = 0

    cleanupRef.current = () => {
      cancelAnimationFrame(frame)
      stream.getTracks().forEach((track) => track.stop())
      context.close().catch(() => {})
      cleanupRef.current = () => {}
    }

    setState('listening')

    const tick = () => {
      analyser.getFloatTimeDomainData(samples)

      let sum = 0
      for (const sample of samples) {
        sum += sample * sample
      }

      // RMS scaled so normal speech at arm's length lands around a third.
      const value = Math.min(1, Math.sqrt(sum / samples.length) * 4)
      peak = Math.max(peak, value)
      loudFrames += value > VOICE_THRESHOLD ? 1 : 0
      setLevel(value)

      if (loudFrames >= VOICE_FRAMES) {
        cleanupRef.current()
        onResult('passed', `Voice picked up, peak ${Math.round(peak * 100)}%`)
        return
      }

      if (performance.now() - startedAt > LISTEN_SECONDS * 1000) {
        cleanupRef.current()
        setState('quiet')
        return
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
  }

  return (
    <div className="grid gap-3">
      {state === 'idle' || state === 'starting' ? (
        <>
          <p className="text-sm text-muted">
            Your browser will ask to use the microphone. Nothing is recorded or sent anywhere.
          </p>
          <div>
            <Button onClick={start} disabled={state === 'starting'}>
              <Mic className="size-4" aria-hidden="true" />
              Start listening
            </Button>
          </div>
        </>
      ) : null}

      {state === 'listening' && (
        <>
          <p className="text-sm font-semibold text-ink">Say “testing, one, two, three”.</p>
          <Meter value={level} label="Microphone level" />
        </>
      )}

      {state === 'quiet' && (
        <Ask
          question={`Nothing loud enough was heard in ${LISTEN_SECONDS} seconds.`}
          yes="Try again"
          no="Mark as a problem"
          onYes={start}
          onNo={() => onResult('failed', 'No voice picked up')}
        />
      )}
    </div>
  )
}

export function CameraTest({ onResult }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [facing, setFacing] = useState('environment')
  const [cameraCount, setCameraCount] = useState(0)
  const [state, setState] = useState('idle')

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => stop, [])

  async function open(nextFacing = facing) {
    stop()
    setState('starting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing } },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Labels and counts are only filled in once a permission has been granted.
      const devices = await navigator.mediaDevices.enumerateDevices()
      setCameraCount(devices.filter((device) => device.kind === 'videoinput').length)
      setFacing(nextFacing)
      setState('open')
    } catch (error) {
      setState('idle')
      onResult(isPermissionError(error) ? 'blocked' : 'failed', error?.message)
    }
  }

  function finish(status, note) {
    stop()
    onResult(status, note)
  }

  const countNote = cameraCount > 0 ? `${cameraCount} camera${cameraCount === 1 ? '' : 's'} found` : undefined

  return (
    <div className="grid gap-3">
      <div
        className={`relative overflow-hidden rounded-card bg-dark ${state === 'open' ? 'aspect-[3/4] max-h-[60vh] sm:aspect-video' : 'hidden'}`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`size-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
        />
      </div>

      {state !== 'open' ? (
        <>
          <p className="text-sm text-muted">
            Your browser will ask to use the camera. The picture stays on this phone.
          </p>
          <div>
            <Button onClick={() => open()} disabled={state === 'starting'}>
              <Camera className="size-4" aria-hidden="true" />
              Open the camera
            </Button>
          </div>
        </>
      ) : (
        <Ask
          question="Is the picture sharp, with no spots, haze or cracks in the image?"
          yes="Yes, it looks clean"
          no="No, something's wrong"
          onYes={() => finish('passed', countNote)}
          onNo={() => finish('failed', 'Blur, spots or cracks in the image')}
        >
          {cameraCount > 1 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => open(facing === 'user' ? 'environment' : 'user')}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Switch to {facing === 'user' ? 'back' : 'front'} camera
            </Button>
          )}
        </Ask>
      )}
    </div>
  )
}

export function VibrationTest({ onResult }) {
  const [buzzed, setBuzzed] = useState(false)

  function buzz() {
    navigator.vibrate([250, 120, 250, 120, 500])
    setBuzzed(true)
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">Hold the phone in your hand. Silent mode can block this.</p>
      <div>
        <Button variant={buzzed ? 'secondary' : 'primary'} onClick={buzz}>
          {buzzed ? 'Vibrate again' : 'Vibrate'}
        </Button>
      </div>
      {buzzed && (
        <Ask
          question="Did you feel three buzzes, the last one longer?"
          onYes={() => onResult('passed')}
          onNo={() => onResult('failed', 'No vibration felt')}
        />
      )}
    </div>
  )
}

/** How far the phone has to tilt, in m/s² of gravity shift, to count as moved. */
const TILT_THRESHOLD = 3
const MOTION_SECONDS = 12

export function MotionTest({ onResult }) {
  const [reading, setReading] = useState(null)
  const [state, setState] = useState('idle')
  const cleanupRef = useRef(() => {})

  useEffect(() => () => cleanupRef.current(), [])

  async function start() {
    // iOS 13+ hides motion behind a permission that must come from a tap.
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const answer = await DeviceMotionEvent.requestPermission()

        if (answer !== 'granted') {
          onResult('blocked')
          return
        }
      } catch {
        onResult('blocked')
        return
      }
    }

    let first = null
    let events = 0
    let hasGyro = false

    function onMotion(event) {
      const gravity = event.accelerationIncludingGravity

      if (!gravity || gravity.x == null) {
        return
      }

      events += 1
      hasGyro = hasGyro || event.rotationRate?.alpha != null
      first = first ?? { x: gravity.x, y: gravity.y, z: gravity.z }
      setReading({ x: gravity.x, y: gravity.y, z: gravity.z })

      const shift = Math.hypot(gravity.x - first.x, gravity.y - first.y, gravity.z - first.z)

      if (shift > TILT_THRESHOLD) {
        cleanupRef.current()
        onResult('passed', hasGyro ? 'Accelerometer and gyroscope responding' : 'Accelerometer responding')
      }
    }

    const timer = window.setTimeout(() => {
      cleanupRef.current()

      if (events === 0) {
        onResult('unsupported', 'No sensor readings reached the browser')
      } else {
        setState('still')
      }
    }, MOTION_SECONDS * 1000)

    window.addEventListener('devicemotion', onMotion)
    cleanupRef.current = () => {
      window.removeEventListener('devicemotion', onMotion)
      window.clearTimeout(timer)
      cleanupRef.current = () => {}
    }

    setState('listening')
  }

  // The dot follows gravity: tilt the phone and it rolls toward the low side.
  const dotX = reading ? Math.max(-1, Math.min(1, -reading.x / 9.8)) : 0
  const dotY = reading ? Math.max(-1, Math.min(1, reading.y / 9.8)) : 0

  return (
    <div className="grid gap-3">
      {state === 'idle' && (
        <div>
          <Button onClick={start}>Start sensors</Button>
        </div>
      )}

      {state === 'listening' && (
        <div className="flex items-center gap-5">
          <div className="relative size-28 shrink-0 rounded-full border border-line-2 bg-panel">
            <span
              className="absolute left-1/2 top-1/2 size-5 rounded-full bg-accent shadow-sm transition-transform duration-100"
              style={{
                transform: `translate(calc(-50% + ${dotX * 44}px), calc(-50% + ${dotY * 44}px))`,
              }}
            />
          </div>
          <p className="text-sm font-semibold text-ink">
            {reading ? 'Now tilt the phone toward you.' : 'Waiting for the sensors…'}
          </p>
        </div>
      )}

      {state === 'still' && (
        <Ask
          question="The sensors reported, but the phone barely moved."
          yes="Try again"
          no="Mark as a problem"
          onYes={start}
          onNo={() => onResult('failed', 'Sensor readings did not change when tilted')}
        />
      )}
    </div>
  )
}

export function BatteryTest({ onResult }) {
  useEffect(() => {
    let cancelled = false

    navigator
      .getBattery()
      .then((battery) => {
        if (!cancelled) {
          const level = Math.round(battery.level * 100)
          onResult('passed', `${level}% charge${battery.charging ? ', charging' : ''}`)
        }
      })
      .catch(() => !cancelled && onResult('unsupported'))

    return () => {
      cancelled = true
    }
  }, [onResult])

  return <p className="text-sm text-muted">Reading the battery…</p>
}
