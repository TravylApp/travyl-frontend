'use client'
import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibregl from 'maplibre-gl'

interface ActivityPin {
  id: string
  title: string
  latitude: number
  longitude: number
  startHour: number
  /** Optional thumbnail rendered inside the popup for a richer "what's here?" feel. */
  image?: string | null
}

function formatHour(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const display = h % 12 || 12
  return `${display}:${String(m).padStart(2, '0')} ${ampm}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface DayMapProps {
  activities: ActivityPin[] // sorted by startHour
  selectedActivityId?: string | null
  onSelectActivity?: (id: string) => void
  className?: string
}

export default function DayMap({
  activities,
  selectedActivityId,
  onSelectActivity,
  className,
}: DayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const popupRef = useRef<maplibregl.Popup | null>(null)

  const validActivities = activities.filter(
    (a) => !(a.latitude === 0 && a.longitude === 0),
  )

  useEffect(() => {
    if (!containerRef.current) return

    // CARTO Voyager — same tile style the rest of the app's leaflet maps use,
    // a much friendlier palette than raw OSM and free for non-commercial use.
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'carto-voyager': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap © CARTO',
          },
        },
        layers: [
          {
            id: 'carto-voyager-tiles',
            type: 'raster',
            source: 'carto-voyager',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [0, 20],
      zoom: 2,
    })

    mapRef.current = map

    map.on('load', () => {
      renderMarkersAndRoute(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-render markers and route when activities or selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.loaded()) return
    renderMarkersAndRoute(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, selectedActivityId])

  // When an activity is selected externally (e.g. user clicked the event on
  // the calendar grid) automatically zoom + show the popup for it. Keeps the
  // map and the calendar in sync without the user having to click the pin.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.loaded()) return
    if (!selectedActivityId) {
      if (popupRef.current) {
        popupRef.current.remove()
        popupRef.current = null
      }
      return
    }
    const idx = validActivities.findIndex((a) => a.id === selectedActivityId)
    if (idx < 0) return
    showPopupFor(map, validActivities[idx], idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActivityId, validActivities.length])

  function showPopupFor(map: maplibregl.Map, activity: ActivityPin, index: number) {
    if (popupRef.current) popupRef.current.remove()

    const time = activity.startHour > 0 ? formatHour(activity.startHour) : ''
    const imageBlock = activity.image
      ? `<div style="position:relative; width:100%; height:96px; border-radius:8px; overflow:hidden; margin-bottom:8px; background:#e2e8f0;">
           <img src="${escapeHtml(activity.image)}" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.display='none'" />
         </div>`
      : ''

    const html = `
      <div style="font-family: inherit; width: 220px; padding: 2px;">
        ${imageBlock}
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
          <span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:#f59e0b; color:white; font-weight:700; font-size:11px;">
            ${index + 1}
          </span>
          ${time ? `<span style="font-size:11px; color:#64748b; font-weight:500;">${escapeHtml(time)}</span>` : ''}
        </div>
        <div style="font-size:13px; font-weight:600; line-height:1.3; color:#0f172a; word-wrap:break-word;">
          ${escapeHtml(activity.title)}
        </div>
      </div>
    `

    popupRef.current = new maplibregl.Popup({
      offset: 18,
      closeButton: false,
      closeOnClick: true,
      maxWidth: '260px',
      className: 'daymap-popup',
    })
      .setLngLat([activity.longitude, activity.latitude])
      .setHTML(html)
      .addTo(map)

    // Smooth zoom-and-center so the selected stop is the focal point.
    map.flyTo({
      center: [activity.longitude, activity.latitude],
      zoom: Math.max(map.getZoom(), 15),
      speed: 1.2,
      essential: true,
    })
  }

  function renderMarkersAndRoute(map: maplibregl.Map) {
    // Remove old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // Tear down any open popup so it isn't anchored to a stale lng/lat after
    // the activity list refreshes.
    if (popupRef.current) {
      popupRef.current.remove()
      popupRef.current = null
    }

    // Remove old route layer/source if they exist
    if (map.getLayer('route-line')) map.removeLayer('route-line')
    if (map.getSource('route')) map.removeSource('route')

    if (validActivities.length === 0) return

    // Add markers. MapLibre owns the outer element's `transform` (it sets
    // a `translate()` to position the pin). Touching that style breaks the
    // pin's anchoring — pins jump to the map origin and don't come back. So
    // the outer wrapper stays untouched; an inner <span> renders the visual
    // and is what we scale on hover.
    validActivities.forEach((activity, index) => {
      const isSelected = activity.id === selectedActivityId
      const wrapper = document.createElement('div')
      // The outer wrapper is positioned by MapLibre — leave its transform
      // alone. We only set width/height so the wrapper hugs the inner.
      const size = isSelected ? 30 : 24
      wrapper.style.width = `${size}px`
      wrapper.style.height = `${size}px`
      wrapper.style.cursor = 'pointer'

      const inner = document.createElement('span')
      inner.style.display = 'flex'
      inner.style.alignItems = 'center'
      inner.style.justifyContent = 'center'
      inner.style.width = '100%'
      inner.style.height = '100%'
      inner.style.borderRadius = '50%'
      inner.style.backgroundColor = isSelected ? '#f59e0b' : '#003594'
      inner.style.color = 'white'
      inner.style.fontSize = isSelected ? '13px' : '11px'
      inner.style.fontWeight = '700'
      inner.style.boxShadow = isSelected
        ? '0 4px 14px rgba(245, 158, 11, 0.45), 0 0 0 4px rgba(245, 158, 11, 0.18)'
        : '0 2px 6px rgba(0, 0, 0, 0.35)'
      inner.style.outline = '2px solid white'
      inner.style.transition = 'transform 150ms ease, box-shadow 150ms ease'
      inner.style.transformOrigin = 'center center'
      inner.textContent = String(index + 1)
      wrapper.appendChild(inner)

      // Scale the inner element on hover; the outer wrapper's transform
      // belongs to MapLibre.
      wrapper.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.15)' })
      wrapper.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)' })

      wrapper.addEventListener('click', (ev) => {
        ev.stopPropagation()
        onSelectActivity?.(activity.id)
        showPopupFor(map, activity, index)
      })

      const marker = new maplibregl.Marker({ element: wrapper })
        .setLngLat([activity.longitude, activity.latitude])
        .addTo(map)

      markersRef.current.push(marker)
    })

    // Add route line if there are 2+ pins
    if (validActivities.length >= 2) {
      const coordinates = validActivities.map((a) => [a.longitude, a.latitude])
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#003594',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      })
    }

    // Fit bounds
    if (validActivities.length === 1) {
      map.setCenter([validActivities[0].longitude, validActivities[0].latitude])
      map.setZoom(14)
    } else {
      const bounds = new maplibregl.LngLatBounds()
      validActivities.forEach((a) => bounds.extend([a.longitude, a.latitude]))
      map.fitBounds(bounds, { padding: 40, animate: false })
    }
  }

  if (validActivities.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-sm text-cal-text-secondary ${className ?? ''}`}
      >
        Add locations to see the route map
      </div>
    )
  }

  return (
    <>
      <style>{`
        .daymap-popup .maplibregl-popup-content {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.08);
          padding: 10px 12px;
          border: 1px solid rgba(15, 23, 42, 0.06);
        }
        .daymap-popup .maplibregl-popup-tip {
          border-top-color: #ffffff !important;
          border-bottom-color: #ffffff !important;
          filter: drop-shadow(0 1px 1px rgba(15, 23, 42, 0.05));
        }
      `}</style>
      <div
        ref={containerRef}
        className={className}
        style={{ width: '100%', height: '100%' }}
      />
    </>
  )
}
