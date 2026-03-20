import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTripNotes, createTripNote, updateTripNote, moveTripNote, deleteTripNote } from '../services/api'
import { supabase } from '../services/supabase'
import type { TripNote } from '../types'

export function useTripNotes(tripId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['tripNotes', tripId], [tripId])

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTripNotes(tripId!),
    enabled: !!tripId,
  })

  // Subscribe to Realtime Postgres Changes for trip_notes
  useEffect(() => {
    if (!tripId) return

    const channel = supabase
      .channel(`trip-notes-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_notes', filter: `trip_id=eq.${tripId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['tripNotes', tripId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId, queryClient])

  const create = useMutation({
    mutationFn: ({ userId, day, hour, color }: { userId: string; day: number; hour: number; color: string }) =>
      createTripNote(tripId!, userId, day, hour, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const update = useMutation({
    mutationFn: ({ noteId, text }: { noteId: string; text: string }) => updateTripNote(noteId, text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const move = useMutation({
    mutationFn: ({ noteId, day, hour }: { noteId: string; day: number; hour: number }) => moveTripNote(noteId, day, hour),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const remove = useMutation({
    mutationFn: (noteId: string) => deleteTripNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createNote: create.mutate,
    updateNote: update.mutate,
    moveNote: move.mutate,
    deleteNote: remove.mutate,
  }
}
