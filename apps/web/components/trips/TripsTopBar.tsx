'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useWeekState } from '@/contexts/WeekStateContext';
import { usePaletteOpen } from '@/contexts/PaletteOpenContext';
import { useAuthStore, supabase } from '@travyl/shared';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const sm = SHORT_MONTHS[weekStart.getMonth()];
  const em = SHORT_MONTHS[weekEnd.getMonth()];
  const year = weekEnd.getFullYear();
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${sm} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${year}`;
  }
  return `${sm} ${weekStart.getDate()} – ${em} ${weekEnd.getDate()}, ${year}`;
}

interface PresenceUser {
  user_id: string;
  avatar_url: string | null;
  display_name: string | null;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].charAt(0).toUpperCase()
    : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function TripsTopBar() {
  const { weekStart, prevWeek, nextWeek, goToToday } = useWeekState();
  const { open: openPalette } = usePaletteOpen();
  const user = useAuthStore((s) => s.user);
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = (
    user?.user_metadata?.display_name || user?.user_metadata?.full_name
  ) as string | undefined;

  // Supabase Presence: join channel and track self, listen for sync events
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`trips-presence-${user.id}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        setPresentUsers(Object.values(state).flat());
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        await channel.track({
          user_id: user.id,
          avatar_url: avatarUrl ?? null,
          display_name: displayName ?? null,
        });
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user, avatarUrl, displayName]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPalette]);

  const visibleAvatars = presentUsers.slice(0, 4);
  const overflow = Math.max(0, presentUsers.length - 4);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-white border-b border-gray-200">
      <div className="h-full flex items-center px-4">

        {/* Left zone: back arrow + wordmark */}
        <div className="flex items-center gap-3 flex-1">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft size={18} />
          </Link>
          <span
            className="text-[#1e3a5f] text-lg"
            style={{ fontFamily: 'Lustria, Georgia, serif' }}
          >
            Travyl
          </span>
        </div>

        {/* Center zone: week navigation controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={prevWeek}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="text-sm font-medium text-gray-900 min-w-[192px] text-center select-none"
            style={{ fontFamily: 'Lustria, Georgia, serif' }}
          >
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={nextWeek}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors ml-1"
          >
            Today
          </button>
        </div>

        {/* Right zone: presence avatar stack + search + user avatar */}
        <div className="flex items-center gap-2 flex-1 justify-end">

          {/* Presence avatar stack — up to 4 avatars + overflow count */}
          <div className="flex items-center -space-x-1.5">
            <AnimatePresence>
              {visibleAvatars.map((u) => (
                <motion.div
                  key={u.user_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <PresenceAvatar avatarUrl={u.avatar_url} displayName={u.display_name} />
                </motion.div>
              ))}
            </AnimatePresence>
            {overflow > 0 && (
              <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600 z-10">
                +{overflow}
              </div>
            )}
          </div>

          {/* ⌘K search icon button */}
          <button
            onClick={openPalette}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Search trips (⌘K)"
          >
            <Search size={16} className="text-gray-600" />
          </button>

          {/* Current user's avatar */}
          {user && (
            <div className="w-7 h-7 rounded-full overflow-hidden bg-[#1e3a5f] flex items-center justify-center text-white text-[11px] font-medium shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName ?? 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(displayName ?? null)
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function PresenceAvatar({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null;
  displayName: string | null;
}) {
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white bg-[#1e3a5f] flex items-center justify-center text-white text-[10px] font-medium">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName ?? 'Collaborator'}
          className="w-full h-full object-cover"
        />
      ) : (
        getInitials(displayName)
      )}
    </div>
  );
}
