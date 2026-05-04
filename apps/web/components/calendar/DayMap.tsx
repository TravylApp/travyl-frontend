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

  const validActivities = activities.filter(
    (a) => !(a.latitude === 0 && a.longitude === 0),
  )

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
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

  function renderMarkersAndRoute(map: maplibregl.Map) {
    // Remove old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // Remove old route layer/source if they exist
    if (map.getLayer('route-line')) map.removeLayer('route-line')
    if (map.getSource('route')) map.removeSource('route')

    if (validActivities.length === 0) return

    // Add markers
    validActivities.forEach((activity, index) => {
      const isSelected = activity.id === selectedActivityId
      const el = document.createElement('div')
      el.className = [
        'w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ring-2 ring-white shadow cursor-pointer',
        isSelected ? 'bg-amber-500' : 'bg-primary',
      ].join(' ')
      el.style.width = '24px'
      el.style.height = '24px'
      el.style.borderRadius = '50%'
      el.style.backgroundColor = isSelected ? '#f59e0b' : '#003594'
      el.style.color = 'white'
      el.style.fontSize = '11px'
      el.style.fontWeight = 'bold'
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)'
      el.style.outline = '2px solid white'
      el.style.cursor = 'pointer'
      el.textContent = String(index + 1)

      el.addEventListener('click', () => {
        onSelectActivity?.(activity.id)
      })

      const marker = new maplibregl.Marker({ element: el })
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
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
