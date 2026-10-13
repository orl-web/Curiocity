import { useCallback, useEffect, useState } from 'react'

export type HeadingState = 'unknown' | 'granted' | 'denied' | 'unsupported'

// Device compass heading in degrees clockwise from true north. Listens only
// while `active` so idle pages never pay for the sensor. iOS requires an
// explicit permission prompt from a user gesture — call requestHeading() from
// a tap; other browsers report 'granted' immediately.
export function useDeviceHeading(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null)
  const [state, setState] = useState<HeadingState>('unknown')

  const requestHeading = useCallback(async () => {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> } | undefined
    if (!DOE) { setState('unsupported'); return }
    if (typeof DOE.requestPermission === 'function') {
      try {
        const result = await DOE.requestPermission()
        setState(result === 'granted' ? 'granted' : 'denied')
      } catch {
        setState('denied')
      }
    } else {
      setState('granted')
    }
  }, [])

  useEffect(() => {
    if (!active || state !== 'granted') return
    const onOrientation = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading is the iOS Safari equivalent of alpha, measured
      // the same way (degrees clockwise from true north).
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      const alpha = typeof webkit === 'number' ? webkit : e.alpha
      if (typeof alpha === 'number') setHeading(((alpha % 360) + 360) % 360)
    }
    const absolute = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(absolute, onOrientation as EventListener)
    return () => window.removeEventListener(absolute, onOrientation as EventListener)
  }, [active, state])

  return { heading, state, requestHeading }
}
