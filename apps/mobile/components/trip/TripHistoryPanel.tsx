import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase, fetchAuditEntries, type EnrichedAuditEntry, TextStyles } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

// ── Types ───────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  type: 'audit' | 'activity';
  action: string;
  activityName: string;
  displayName: string;
  timestamp: string;
}

// ── Action badge styling — matches web ──────────────────────

function actionBadge(action: string): { label: string; color: string; bg: string } {
  if (action.startsWith('Added')) return { label: 'Added', color: '#34d399', bg: 'rgba(52,211,153,0.18)' };
  if (action.startsWith('Removed')) return { label: 'Removed', color: '#f87171', bg: 'rgba(248,113,113,0.18)' };
  if (action.startsWith('Moved')) return { label: 'Moved', color: '#60a5fa', bg: 'rgba(96,165,250,0.18)' };
  if (action.startsWith('Edited')) return { label: 'Edited', color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' };
  if (action.startsWith('Reverted')) return { label: 'Reverted', color: '#a78bfa', bg: 'rgba(167,139,250,0.18)' };
  return { label: 'Changed', color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' };
}

// ── Helpers ─────────────────────────────────────────────────

function auditEntryToHistoryEntry(e: EnrichedAuditEntry, nameMap: Record<string, string>): HistoryEntry {
  let action = '';
  switch (e.edit_type) {
    case 'create': action = `Added "${e.activityName}"`; break;
    case 'delete': action = `Removed "${e.activityName}"`; break;
    case 'move': action = `Moved "${e.activityName}"`; break;
    case 'edit': action = `Edited "${e.activityName}"`; break;
    case 'revert': action = `Reverted "${e.activityName}"`; break;
    default: action = `Changed "${e.activityName}"`;
  }
  return {
    id: `audit-${e.id}`,
    type: 'audit',
    action,
    activityName: e.activityName,
    displayName: e.user_id ? (nameMap[e.user_id] ?? 'Someone') : 'Someone',
    timestamp: e.created_at,
  };
}

// ── Data fetcher (parity with web TripHistoryPanel) ─────────

async function fetchTripHistory(tripId: string): Promise<HistoryEntry[]> {
  const entries: HistoryEntry[] = [];

  // 1. Audit entries from shared service
  const edits = await fetchAuditEntries(tripId, { limit: 100 });
  const nameMap: Record<string, string> = {};
  for (const e of edits) {
    if (e.user_id) nameMap[e.user_id] = e.displayName;
  }

  // 2. Activity records (supplements audit)
  const { data: activities } = await supabase
    .from('activity')
    .select('id, activity_name, user_id, created_at, activity_type')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(50);

  const activityUserIds = new Set<string>();
  for (const a of activities ?? []) if (a.user_id) activityUserIds.add(a.user_id);
  const missingIds = [...activityUserIds].filter((id) => !nameMap[id]);
  if (missingIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', missingIds);
    for (const p of profiles ?? []) nameMap[p.id] = p.display_name ?? 'Unknown';
  }

  const auditActivityIds = new Set<string>();
  for (const e of edits) {
    if (e.edit_type === 'create') auditActivityIds.add(e.activity_id);
    entries.push(auditEntryToHistoryEntry(e, nameMap));
  }
  for (const a of activities ?? []) {
    if (auditActivityIds.has(a.id)) continue;
    const displayName = a.user_id ? (nameMap[a.user_id] ?? 'Someone') : 'Someone';
    entries.push({
      id: `activity-${a.id}`,
      type: 'activity',
      action: `Added "${a.activity_name}"`,
      activityName: a.activity_name,
      displayName,
      timestamp: a.created_at,
    });
  }

  // 3. Trip-context user_history + initial seed entries
  {
    const { data: trip } = await supabase
      .from('trips')
      .select('trip_context, created_at, updated_at')
      .eq('id', tripId)
      .single();

    if (trip) {
      const ctx = trip.trip_context as any;
      const userHistory = (ctx?.user_history ?? []) as { action: string; timestamp: string; actor: string }[];
      for (const h of userHistory) {
        entries.push({
          id: `user-${h.timestamp}`,
          type: 'audit',
          action: h.action,
          activityName: '',
          displayName: h.actor || 'You',
          timestamp: h.timestamp,
        });
      }

      // If only the user_history seed is here, surface the original itinerary
      // entries so the panel isn't empty for newly generated trips.
      if (entries.length === userHistory.length) {
        const itinerary = ctx?.itinerary ?? [];
        for (const day of itinerary) {
          for (const slot of (day.slots ?? [])) {
            const name = slot.poi?.name ?? slot.title ?? 'Activity';
            entries.push({
              id: `ctx-${day.day}-${name}`,
              type: 'activity',
              action: `Added "${name}"`,
              activityName: name,
              displayName: 'Trip planner',
              timestamp: trip.created_at,
            });
          }
        }
      }

      entries.push({
        id: 'trip-created',
        type: 'audit',
        action: 'Trip created',
        activityName: '',
        displayName: 'You',
        timestamp: trip.created_at,
      });

      if (trip.updated_at && trip.updated_at !== trip.created_at) {
        entries.push({
          id: 'trip-enriched',
          type: 'audit',
          action: 'Trip enriched with details',
          activityName: '',
          displayName: 'Travyl',
          timestamp: trip.updated_at,
        });
      }
    }
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return entries;
}

// ── Hook ────────────────────────────────────────────────────

function useTripHistory(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['trip-history', tripId],
    queryFn: () => fetchTripHistory(tripId),
    enabled,
    staleTime: 30_000,
  });
}

// ── Trigger button + bottom-sheet panel ─────────────────────

export function TripHistoryToggle({
  tripId,
  variant = 'hero',
  color,
}: {
  tripId: string;
  variant?: 'hero' | 'toolbar';
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  const colors = useThemeColors();
  const isHero = variant === 'hero';
  const iconColor = color ?? (isHero ? 'rgba(255,255,255,0.85)' : colors.textSecondary);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => {
          if (isHero) {
            return {
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            };
          }
          // Toolbar: when a tint color is provided, use it for bg/border so
          // the button matches sibling tinted toolbar buttons (e.g. the
          // gold plus). Falls back to neutral card background otherwise.
          const tint = color;
          return {
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: tint ? tint + '25' : colors.cardBackground,
            borderWidth: 1,
            borderColor: tint ? tint + '40' : colors.border,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          };
        }}
      >
        <FontAwesome name="clock-o" size={isHero ? 13 : 14} color={iconColor} />
      </Pressable>
      <TripHistoryPanel tripId={tripId} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

function TripHistoryPanel({ tripId, isOpen, onClose }: { tripId: string; isOpen: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  const { data: entries = [], isLoading } = useTripHistory(tripId, isOpen);

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.cardBackground,
            borderTopLeftRadius: 18, borderTopRightRadius: 18,
            paddingTop: 14, paddingBottom: 28, maxHeight: '80%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FontAwesome name="clock-o" size={16} color={colors.text} />
              <Text style={{ ...TextStyles.subhead, color: colors.text }}>Change history</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <FontAwesome name="times" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator color={colors.text} />
              <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginTop: 8 }}>Loading history…</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
              <FontAwesome name="clock-o" size={28} color={colors.textTertiary} />
              <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                No changes yet — anything you or your group adds, edits, or removes will show up here.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 }}>
              {entries.map((entry) => {
                const badge = actionBadge(entry.action);
                let when = '';
                try {
                  when = formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true });
                } catch {
                  when = '';
                }
                return (
                  <View
                    key={entry.id}
                    style={{
                      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                      paddingVertical: 10,
                      borderBottomWidth: 1, borderBottomColor: colors.borderLight,
                    }}
                  >
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                      backgroundColor: badge.bg, marginTop: 2,
                    }}>
                      <Text style={{ ...TextStyles.caption, color: badge.color, fontWeight: '700' }}>
                        {badge.label}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...TextStyles.body, color: colors.text }} numberOfLines={2}>
                        {entry.action}
                      </Text>
                      <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginTop: 2 }}>
                        {entry.displayName}{when ? ` · ${when}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
