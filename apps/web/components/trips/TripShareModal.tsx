'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, X, Users2, Link as LinkIcon, Check, MapPin, Loader2 } from 'lucide-react';
import type { TripCard } from '@travyl/shared';
import { ensureShareLinkToken, updateTripVisibility } from '@travyl/shared';

interface TripShareModalProps {
  trip: TripCard;
  isOpen: boolean;
  onClose: () => void;
}

export function TripShareModal({ trip, isOpen, onClose }: TripShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Generate share link when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    (async () => {
      try {
        const token = await ensureShareLinkToken(trip.id);
        await updateTripVisibility(trip.id, 'link');
        setShareUrl(`${window.location.origin}/trip/${trip.id}/share/${token}`);
      } catch (err) {
        // Fallback to direct URL
        setShareUrl(`${window.location.origin}/trip/${trip.id}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, trip.id]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setIsAnimating(true);
      setTimeout(() => {
        setCopied(false);
        setIsAnimating(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [shareUrl]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handler);
    }
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const heroImage = (trip as any).trip_context?.hero_image_url
    || (trip as any).trip_context?.hero_images?.[0]
    || null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md mx-4 bg-white dark:bg-[#1a2535] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Hero image */}
            {heroImage && !imageError && (
              <div className="relative h-40 overflow-hidden">
                <img
                  src={heroImage}
                  alt={trip.destination}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="flex items-center gap-1.5 text-white/80 text-xs mb-1">
                    <MapPin size={12} />
                    <span>{trip.destination}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users2 size={18} className="text-[#1e3a5f] dark:text-[#60a5fa]" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Trip</h3>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Anyone with this link who is signed in can view your trip to {trip.destination}.
              </p>

              {/* Share URL */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 min-w-0">
                  <LinkIcon size={14} className="text-gray-400 shrink-0" />
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-gray-400" />
                      <span className="text-sm text-gray-400">Generating link...</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate" title={shareUrl}>{shareUrl}</span>
                  )}
                </div>
                <button
                  onClick={handleCopy}
                  disabled={loading || !shareUrl}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-sm font-medium hover:bg-[#2a4d78] transition-colors disabled:opacity-50"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
