'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Star, MapPin, Clock, Heart, Share2, ChevronLeft, ChevronRight,
  Check, Phone, Calendar, ExternalLink, X, Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PhoneStep {
  title: string;
  description: string;
  screenshot: string;
}

interface ActivityDetail {
  id: string;
  name: string;
  location: string;
  description: string;
  images: string[];
  rating: number;
  reviewCount?: number;
  category: string;
  duration?: string;
  price?: string;
  highlights?: string[];
  included?: string[];
  notIncluded?: string[];
  meetingPoint?: string;
  languages?: string[];
  difficulty?: string;
  accessibility?: string;
  minParticipants?: number;
  maxParticipants?: number;
  phoneSteps?: PhoneStep[];
  bookingUrl?: string;
  cancellationPolicy?: string;
}

interface DetailedActivityCardProps {
  activity: ActivityDetail;
  layout?: 'modal' | 'page';
  onClose?: () => void;
  onBook?: (id: string) => void;
  onFavorite?: (id: string) => void;
  onShare?: (id: string) => void;
}

export function DetailedActivityCard({
  activity,
  layout = 'modal',
  onClose,
  onBook,
  onFavorite,
  onShare,
}: DetailedActivityCardProps) {
  const [imageIdx, setImageIdx] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const images = activity.images.length > 0 ? activity.images : [];

  const nextImage = () => setImageIdx((i) => (i + 1) % images.length);
  const prevImage = () => setImageIdx((i) => (i - 1 + images.length) % images.length);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    onFavorite?.(activity.id);
  };

  const content = (
    <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full mx-auto shadow-xl">
      {/* Image gallery */}
      {images.length > 0 && (
        <div className="relative h-[220px] sm:h-[260px] overflow-hidden group">
          <Image
            src={images[imageIdx]}
            alt={activity.name}
            fill
            className="object-cover transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, 520px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Image nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <ChevronLeft size={16} className="text-gray-700" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <ChevronRight size={16} className="text-gray-700" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === imageIdx ? 'bg-white w-4' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Category badge */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm">
            <span className="text-[11px] font-semibold text-[#1e3a5f]">{activity.category}</span>
          </div>

          {/* Close button (modal only) */}
          {layout === 'modal' && onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          )}

          {/* Rating overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span className="text-[12px] font-bold text-gray-800">{activity.rating}</span>
            {activity.reviewCount && (
              <span className="text-[10px] text-gray-500">({activity.reviewCount})</span>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">{activity.name}</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin size={11} className="text-gray-400" />
              <span>{activity.location}</span>
            </div>
            {activity.duration && (
              <div className="flex items-center gap-1">
                <Clock size={11} className="text-gray-400" />
                <span>{activity.duration}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed">{activity.description}</p>

        {/* Highlights */}
        {activity.highlights && activity.highlights.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-2">Highlights</h3>
            <div className="space-y-1.5">
              {activity.highlights.map((h) => (
                <div key={h} className="flex items-start gap-2">
                  <Check size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-600">{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Included / Not Included */}
        {(activity.included || activity.notIncluded) && (
          <div className="grid grid-cols-2 gap-3">
            {activity.included && activity.included.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-2">Included</h3>
                <div className="space-y-1.5">
                  {activity.included.map((item) => (
                    <div key={item} className="flex items-start gap-1.5">
                      <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activity.notIncluded && activity.notIncluded.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-2">Not Included</h3>
                <div className="space-y-1.5">
                  {activity.notIncluded.map((item) => (
                    <div key={item} className="flex items-start gap-1.5">
                      <X size={12} className="text-red-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meeting Point */}
        {activity.meetingPoint && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100">
            <MapPin size={13} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-wide">Meeting Point</span>
              <p className="text-xs text-blue-700 mt-0.5">{activity.meetingPoint}</p>
            </div>
          </div>
        )}

        {/* Info badges: languages, difficulty, group size, accessibility */}
        {(activity.languages || activity.difficulty || activity.maxParticipants || activity.accessibility) && (
          <div className="flex flex-wrap gap-2">
            {activity.languages && activity.languages.length > 0 && (
              <span className="px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600 font-medium">
                {activity.languages.join(', ')}
              </span>
            )}
            {activity.difficulty && (
              <span className="px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600 font-medium">
                {activity.difficulty}
              </span>
            )}
            {activity.maxParticipants && (
              <span className="px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600 font-medium">
                Max {activity.maxParticipants} people
              </span>
            )}
            {activity.accessibility && (
              <span className="px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600 font-medium">
                {activity.accessibility}
              </span>
            )}
          </div>
        )}

        {/* Phone Steps */}
        {activity.phoneSteps && activity.phoneSteps.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-3">How to Get There</h3>
            <div className="space-y-3">
              {activity.phoneSteps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  </div>
                  <div className="w-12 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <img src={step.screenshot} alt={step.title} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancellation policy */}
        {activity.cancellationPolicy && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <Shield size={13} className="text-emerald-600 mt-0.5 shrink-0" />
            <span className="text-xs text-emerald-700">{activity.cancellationPolicy}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={handleFavorite}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              isFavorited
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Heart size={13} className={isFavorited ? 'fill-red-500' : ''} />
            {isFavorited ? 'Saved' : 'Save'}
          </button>

          <button
            onClick={() => onShare?.(activity.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Share2 size={13} />
            Share
          </button>

          <div className="flex-1" />

          {activity.price && (
            <span className="text-sm font-bold text-gray-900 mr-2">{activity.price}</span>
          )}

          {activity.bookingUrl ? (
            <a
              href={activity.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
            >
              <Calendar size={12} />
              Book Now
            </a>
          ) : (
            <button
              onClick={() => onBook?.(activity.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
            >
              <Calendar size={12} />
              Book Now
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (layout === 'modal') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {content}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return content;
}
