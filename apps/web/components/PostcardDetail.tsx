'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Calendar, MapPin, Plane, Heart, LayoutGrid, Globe, RotateCcw } from 'lucide-react';
import type { PostcardData } from '@travyl/shared';

interface PostcardDetailProps {
  data: PostcardData | null;
  onClose: () => void;
}

const stampColors: Record<string, { bg: string; border: string; text: string }> = {
  Beach:      { bg: '#D4F1F9', border: '#7CC8E8', text: '#1A6E8E' },
  Mountain:   { bg: '#E0D4F5', border: '#A98EDB', text: '#4A2D82' },
  Music:      { bg: '#FDE2EF', border: '#E88CB8', text: '#8E1A5A' },
  City:       { bg: '#FFF3D4', border: '#E8C86D', text: '#8E6B1A' },
  Adventure:  { bg: '#D4F5E0', border: '#6DCC8A', text: '#1A6B3A' },
  Nature:     { bg: '#D4EEDF', border: '#6EBE8A', text: '#1E5E3A' },
  Historical: { bg: '#F5E6D4', border: '#D4A86D', text: '#6E4A1A' },
  Art:        { bg: '#FFF3D4', border: '#E8C86D', text: '#8E6B1A' },
  Festival:   { bg: '#FFF3D4', border: '#E8C86D', text: '#8E6B1A' },
};
const defaultStamp = { bg: '#E8E0D0', border: '#B8A888', text: '#5C4A2E' };

export function PostcardDetail({ data, onClose }: PostcardDetailProps) {
  const [flipped, setFlipped] = useState(false);
  const [prevId, setPrevId] = useState<string | null>(null);

  if (data && data.id !== prevId) {
    setPrevId(data.id);
    setFlipped(false);
  }

  const stamp = data ? (stampColors[data.category] || defaultStamp) : defaultStamp;
  const tilt = 1.5;

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key={data.id}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Postcard */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0.3, y: -300, rotate: -15, opacity: 0 }}
            animate={{ scale: 1, y: 0, rotate: tilt, opacity: 1 }}
            exit={{ scale: 0.5, y: 200, rotate: 12, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 180, mass: 0.8, opacity: { duration: 0.3 } }}
          >
            {/* Close */}
            <motion.button
              onClick={onClose}
              className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white transition-colors"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-4 h-4 text-[#4A3520]" />
            </motion.button>

            {/* Flip hint */}
            <motion.button
              onClick={() => setFlipped(!flipped)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-[11px] font-semibold text-[#6B5B47] hover:bg-white transition-colors"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw className="w-3 h-3" />
              {flipped ? 'View front' : 'Flip over'}
            </motion.button>

            {/* Push pin */}
            <motion.div
              className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 12 }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: `radial-gradient(circle at 38% 32%, #fff 0%, ${data.color} 50%, ${data.color}cc 100%)`,
                border: '2.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 3px 8px rgba(0,0,0,0.35), inset 0 -2px 4px rgba(0,0,0,0.25), inset 0 2px 3px rgba(255,255,255,0.4)',
              }} />
              <div style={{ width: 2.5, height: 8, background: 'linear-gradient(to bottom,#777,#444)', margin: '-1px auto 0', borderRadius: '0 0 1.5px 1.5px' }} />
            </motion.div>

            {/* 3D Flip Card */}
            <div
              className="cursor-pointer"
              onClick={() => setFlipped(!flipped)}
              style={{ perspective: '1200px', width: '360px', maxWidth: '88vw' }}
            >
              <motion.div
                style={{ transformStyle: 'preserve-3d', width: '100%' }}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* FRONT */}
                <div style={{ backfaceVisibility: 'hidden' }} className="rounded-md overflow-hidden">
                  <div className="relative" style={{
                    background: 'linear-gradient(145deg, #FFF8EC 0%, #F5E6CC 40%, #EDD9B5 100%)',
                    border: '1px solid #C4A870', borderRadius: '6px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)',
                    padding: '10px',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 6, opacity: 0.04, background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)', pointerEvents: 'none' }} />

                    {/* Photo */}
                    <div style={{ border: '3px solid #fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', overflow: 'hidden', position: 'relative' }}>
                      <img src={data.imageUrl} alt={data.name} className="w-full object-cover" style={{ height: '200px' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,220,150,0.08) 0%, transparent 40%, rgba(0,0,0,0.06) 100%)' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(58,40,16,0.6) 0%, transparent 100%)' }} />
                      <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10, zIndex: 2 }}>
                        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '9px', color: 'rgba(255,255,255,0.7)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1px' }}>
                          Greetings from
                        </p>
                        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.1, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                          {data.name}
                        </h2>
                      </div>
                    </div>

                    {/* Info bar */}
                    <div className="relative flex items-center gap-2 pt-2.5 pb-1 px-1" style={{ zIndex: 1 }}>
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <MapPin style={{ width: 11, height: 11, color: '#A0896A', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#7A6B52', fontWeight: 600 }} className="truncate">{data.location}</span>
                        {data.subtitle && (
                          <>
                            <span style={{ color: '#C4A870', fontSize: 9 }}>&middot;</span>
                            <span style={{ fontSize: 10, color: '#A0896A', fontStyle: 'italic' }} className="truncate">{data.subtitle}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {data.type === 'place' && data.rating && (
                          <div className="flex items-center gap-0.5">
                            <Star style={{ width: 11, height: 11, fill: '#E8B400', color: '#E8B400' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#8B6B00' }}>{data.rating}</span>
                          </div>
                        )}
                        {data.type === 'event' && data.date && (
                          <div className="flex items-center gap-0.5">
                            <Calendar style={{ width: 10, height: 10, color: '#A0896A' }} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#7A6B52' }}>{data.date}</span>
                          </div>
                        )}
                        <span style={{ padding: '1.5px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: stamp.bg, color: stamp.text, border: `1px solid ${stamp.border}`, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                          {data.category}
                        </span>
                      </div>
                    </div>

                    {/* Stamp */}
                    <motion.div
                      initial={{ rotate: 12, scale: 0, opacity: 0 }}
                      animate={{ rotate: 4, scale: 1, opacity: 0.9 }}
                      transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 15 }}
                      style={{
                        position: 'absolute', top: 12, right: 12, width: 48, height: 56,
                        background: `linear-gradient(135deg, ${stamp.bg} 0%, ${stamp.bg}cc 100%)`,
                        border: `2px dashed ${stamp.border}`, borderRadius: 2,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 5, boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                      }}
                    >
                      <Plane style={{ width: 16, height: 16, color: stamp.text, opacity: 0.7, transform: 'rotate(-20deg)' }} />
                      <span style={{ fontSize: 6, fontWeight: 800, color: stamp.text, marginTop: 2, letterSpacing: '0.5px' }}>AIRMAIL</span>
                      <span style={{ fontSize: 5, color: stamp.text, opacity: 0.6 }}>TRAVYL</span>
                    </motion.div>

                    {/* Postmark */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0, rotate: 0 }}
                      animate={{ scale: 1, opacity: 1, rotate: -12 }}
                      transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 12 }}
                      style={{ position: 'absolute', top: 18, right: 34, width: 50, height: 50, border: '2px solid rgba(180,50,50,0.18)', borderRadius: '50%', zIndex: 6 }}
                    >
                      <div style={{ position: 'absolute', top: '50%', left: -5, right: -5, height: 1, background: 'rgba(180,50,50,0.12)' }} />
                      <div style={{ position: 'absolute', top: 'calc(50% - 5px)', left: -5, right: -5, height: 1, background: 'rgba(180,50,50,0.09)' }} />
                      <div style={{ position: 'absolute', top: 'calc(50% + 5px)', left: -5, right: -5, height: 1, background: 'rgba(180,50,50,0.09)' }} />
                      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 6, fontWeight: 800, color: 'rgba(180,50,50,0.2)', letterSpacing: 1, whiteSpace: 'nowrap' }}>2026</span>
                    </motion.div>

                    {/* Corners */}
                    <div style={{ position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRight: '1px solid #D4C4A0', borderBottom: '1px solid #D4C4A0', opacity: 0.4 }} />
                    <div style={{ position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderLeft: '1px solid #D4C4A0', borderTop: '1px solid #D4C4A0', opacity: 0.4 }} />
                  </div>
                </div>

                {/* BACK */}
                <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', top: 0, left: 0, width: '100%' }} className="rounded-md overflow-hidden">
                  <div style={{
                    background: 'linear-gradient(145deg, #FFF8EC 0%, #F5E6CC 40%, #EDD9B5 100%)',
                    border: '1px solid #C4A870', borderRadius: '6px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)',
                    padding: '24px', minHeight: '340px', position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 6, opacity: 0.04, background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)', pointerEvents: 'none' }} />

                    {/* Center divider */}
                    <div style={{ position: 'absolute', top: 20, bottom: 20, left: '55%', width: 1, background: 'repeating-linear-gradient(to bottom, #C4A870 0, #C4A870 6px, transparent 6px, transparent 12px)', opacity: 0.5 }} />

                    {/* Left — message */}
                    <div style={{ width: '52%', position: 'relative', zIndex: 1 }}>
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 10, color: '#A0896A', marginBottom: 6, letterSpacing: '0.5px' }}>Dear fellow traveler,</p>
                        {data.note && (
                          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#4A3520', lineHeight: 1.7, marginBottom: 12, fontStyle: 'italic', backgroundImage: 'repeating-linear-gradient(transparent, transparent 22px, #D4C4A0 22px, #D4C4A0 23px)', paddingBottom: 4 }}>
                            &ldquo;{data.note}&rdquo;
                          </p>
                        )}
                        {data.description && (
                          <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#6B5B47', lineHeight: 1.6, marginBottom: 12, backgroundImage: 'repeating-linear-gradient(transparent, transparent 22px, #D4C4A0 22px, #D4C4A0 23px)' }}>
                            {data.description}
                          </p>
                        )}
                        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11, color: '#A0896A', marginTop: 16 }}>
                          Wish you were here!
                        </p>
                      </div>

                      {data.tags && data.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {data.tags.map((tag, i) => (
                            <span key={tag} style={{
                              padding: '3px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                              background: i % 3 === 0 ? '#E8D5B0' : i % 3 === 1 ? '#D4E8D0' : '#D0D8E8',
                              color: i % 3 === 0 ? '#6B5B47' : i % 3 === 1 ? '#3B5E3F' : '#3B4B6B',
                              border: `1px solid ${i % 3 === 0 ? '#C4B090' : i % 3 === 1 ? '#A0C0A0' : '#A0A8C0'}`,
                              letterSpacing: '0.3px', textTransform: 'uppercase', display: 'inline-block',
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right — stamps & address */}
                    <div style={{ position: 'absolute', top: 24, right: 24, width: '38%', zIndex: 1 }}>
                      <div style={{
                        float: 'right', width: 60, height: 72,
                        background: `linear-gradient(135deg, ${stamp.bg} 0%, ${stamp.bg}cc 100%)`,
                        border: `2.5px dashed ${stamp.border}`, borderRadius: 2,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      }}>
                        <Globe style={{ width: 20, height: 20, color: stamp.text, opacity: 0.7 }} />
                        <span style={{ fontSize: 7, fontWeight: 800, color: stamp.text, marginTop: 3, letterSpacing: 1 }}>TRAVYL</span>
                        <span style={{ fontSize: 6, color: stamp.text, opacity: 0.6, marginTop: 1 }}>POSTCARD</span>
                      </div>

                      <div style={{ clear: 'both', marginBottom: 20 }}>
                        <div style={{ width: 64, height: 64, border: '2.5px solid rgba(180,50,50,0.2)', borderRadius: '50%', margin: '0 auto', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '50%', left: -6, right: -6, height: 1.5, background: 'rgba(180,50,50,0.12)' }} />
                          <div style={{ position: 'absolute', top: 'calc(50% - 6px)', left: -6, right: -6, height: 1, background: 'rgba(180,50,50,0.08)' }} />
                          <div style={{ position: 'absolute', top: 'calc(50% + 6px)', left: -6, right: -6, height: 1, background: 'rgba(180,50,50,0.08)' }} />
                          <span style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 7, fontWeight: 800, color: 'rgba(180,50,50,0.22)', whiteSpace: 'nowrap' }}>{data.location.toUpperCase()}</span>
                          <span style={{ position: 'absolute', top: '65%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 8, fontWeight: 700, color: 'rgba(180,50,50,0.18)' }}>2026</span>
                        </div>
                      </div>

                      <div style={{ paddingLeft: 4 }}>
                        <p style={{ fontSize: 8, fontWeight: 700, color: '#A0896A', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>TO:</p>
                        <div style={{ borderBottom: '1px solid #C4A870', marginBottom: 10, paddingBottom: 4 }}>
                          <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12, color: '#4A3520' }}>Fellow Traveler</span>
                        </div>
                        <div style={{ borderBottom: '1px solid #C4A870', marginBottom: 10, paddingBottom: 4 }}>
                          <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11, color: '#7A6B52' }}>{data.location}</span>
                        </div>
                        <div style={{ borderBottom: '1px solid #C4A870', paddingBottom: 4 }}>
                          <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11, color: '#7A6B52' }}>{data.category} Trip</span>
                        </div>
                      </div>

                      {data.board && (
                        <div style={{ marginTop: 16, padding: '6px 10px', background: 'rgba(74,159,216,0.08)', borderRadius: 4, border: '1px solid rgba(74,159,216,0.15)' }}>
                          <div className="flex items-center gap-1.5">
                            <LayoutGrid style={{ width: 10, height: 10, color: '#4A9FD8' }} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#4A9FD8', letterSpacing: '0.3px' }}>{data.board}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-center mt-4">
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Heart style={{ width: 14, height: 14, color: '#EC4899', fill: '#EC4899' }} />
                        </div>
                      </div>
                    </div>

                    {/* Corner accents */}
                    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRight: '1px solid #D4C4A0', borderBottom: '1px solid #D4C4A0', opacity: 0.4 }} />
                    <div style={{ position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderLeft: '1px solid #D4C4A0', borderTop: '1px solid #D4C4A0', opacity: 0.4 }} />
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRight: '1px solid #D4C4A0', borderTop: '1px solid #D4C4A0', opacity: 0.4 }} />
                    <div style={{ position: 'absolute', bottom: 8, left: 8, width: 28, height: 28, borderLeft: '1px solid #D4C4A0', borderBottom: '1px solid #D4C4A0', opacity: 0.4 }} />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
