'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, X, Users2, Link as LinkIcon, Check, MapPin } from 'lucide-react';
import type { MockTripCard } from '@travyl/shared';

interface TripShareModalProps {
  trip: MockTripCard;
  isOpen: boolean;
  onClose: () => void;
}

export function TripShareModal({ trip, isOpen, onClose }: TripShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const shareUrl = `${window.location.origin}/trip/${trip.id}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setIsAnimating(true);

      // Reset after 2 seconds
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

  // Handle escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handler);
    }

    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with destination image */}
            <div className="relative h-40 overflow-hidden">
              {/* Destination image or fallback gradient */}
              {trip.image && !imageError ? (
                <img
                  src={trip.image}
                  alt={trip.destination}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f]" />
              )}

              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-white" />
              </button>

              {/* Trip destination overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={16} className="text-white/90" />
                  <p className="text-sm text-white/90 font-medium">{trip.destination}</p>
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">
                  {trip.title}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Anyone with the link can view this trip
              </p>

              {/* Share link section */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Share Link
                </label>

                {/* Link input with copy button */}
                <div className="relative group">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-colors">
                    <LinkIcon size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />

                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none truncate"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />

                    <motion.button
                      onClick={handleCopy}
                      className={`
                        shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                        ${copied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#1e3a5f] text-white hover:bg-[#2d4a6f] hover:shadow-lg dark:bg-blue-600 dark:hover:bg-blue-700'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {copied ? (
                        <span className="flex items-center gap-1.5">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                          >
                            <Check size={14} />
                          </motion.div>
                          Copied!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Copy size={14} />
                          Copy
                        </span>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Success message */}
                <AnimatePresence>
                  {copied && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm"
                    >
                      <Check size={16} />
                      <span>Link copied to clipboard</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer hint */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Share this link with friends and family to let them view your trip
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
