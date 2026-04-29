'use client'

import { motion } from 'motion/react'

export function LogoIllustration() {
  return (
    <motion.div
      className="w-48 h-48 mx-auto relative"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Globe base */}
        <circle cx="100" cy="100" r="70" fill="#1e3a5f" opacity="0.08" />
        <circle cx="100" cy="100" r="70" stroke="#1e3a5f" strokeWidth="1.5" opacity="0.3" />
        {/* Plane */}
        <motion.g
          animate={{ x: [0, 6, 0], y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path
            d="M70 90 L120 70 L140 75 L110 95 Z"
            fill="#1e3a5f"
            stroke="#1e3a5f"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M110 95 L130 115 L120 120 Z"
            fill="#2a4a6f"
            stroke="#1e3a5f"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M70 90 L60 95 L70 100 Z"
            fill="#3a5a7f"
            stroke="#1e3a5f"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </motion.g>
        {/* Continents hint */}
        <ellipse cx="130" cy="80" rx="18" ry="12" fill="#1e3a5f" opacity="0.1" />
        <ellipse cx="75" cy="125" rx="14" ry="8" fill="#1e3a5f" opacity="0.1" />
        {/* Pin */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <path
            d="M100 100 C100 90 110 85 110 78 C110 72.5 105.5 68 100 68 C94.5 68 90 72.5 90 78 C90 85 100 100 100 100 Z"
            fill="#c8a96a"
          />
          <circle cx="100" cy="77" r="3" fill="white" />
        </motion.g>
      </svg>
    </motion.div>
  )
}

export function SearchIllustration() {
  return (
    <div className="w-56 h-56 mx-auto relative">
      <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Search bar */}
        <rect x="40" y="80" width="160" height="44" rx="22" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="62" cy="102" r="8" stroke="#1e3a5f" strokeWidth="2" />
        <line x1="68" y1="108" x2="74" y2="114" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" />
        <text x="82" y="107" fontSize="13" fill="#94a3b8" fontFamily="sans-serif">Paris, France</text>
        {/* Sparkle */}
        <motion.g
          animate={{ rotate: [0, 180] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '200px 65px' }}
        >
          <path d="M200 55 L202 63 L210 65 L202 67 L200 75 L198 67 L190 65 L198 63 Z" fill="#c8a96a" />
        </motion.g>
        {/* Generated cards */}
        <motion.rect
          x="45" y="140" width="70" height="55" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
        />
        <motion.rect
          x="125" y="140" width="70" height="55" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
        />
        <rect x="51" y="150" width="40" height="6" rx="3" fill="#e2e8f0" />
        <rect x="51" y="160" width="25" height="4" rx="2" fill="#f1f5f9" />
        <rect x="131" y="150" width="40" height="6" rx="3" fill="#e2e8f0" />
        <rect x="131" y="160" width="25" height="4" rx="2" fill="#f1f5f9" />
        {/* Arrow from search to cards */}
        <motion.path
          d="M120 125 L120 135"
          stroke="#c8a96a" strokeWidth="2" strokeDasharray="4 3"
          animate={{ strokeDashoffset: [0, -14] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </svg>
    </div>
  )
}

export function CalendarIllustration() {
  return (
    <div className="w-56 h-56 mx-auto relative">
      <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Calendar grid */}
        <rect x="30" y="50" width="180" height="155" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
        {/* Month header */}
        <rect x="30" y="50" width="180" height="32" rx="10" fill="#1e3a5f" />
        <rect x="30" y="70" width="180" height="12" fill="#1e3a5f" />
        <text x="120" y="71" textAnchor="middle" fontSize="11" fill="white" fontWeight="600" fontFamily="sans-serif">April 2026</text>
        {/* Day labels */}
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <text key={i} x={42 + i * 23} y="97" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="sans-serif">{d}</text>
        ))}
        {/* Events */}
        <motion.rect
          x="42" y="105" width="40" height="22" rx="4" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1"
          animate={{ x: [42, 65, 42] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <text x="49" y="119" fontSize="8" fill="#1e40af" fontFamily="sans-serif">Louvre</text>
        <rect x="88" y="130" width="40" height="22" rx="4" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" />
        <text x="95" y="144" fontSize="8" fill="#92400e" fontFamily="sans-serif">Dinner</text>
        <rect x="134" y="105" width="40" height="22" rx="4" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1" />
        <text x="139" y="119" fontSize="8" fill="#065f46" fontFamily="sans-serif">Flight</text>
        {/* Drag handle */}
        <motion.g
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="82" y="155" width="4" height="18" rx="2" fill="#cbd5e1" />
          <rect x="88" y="155" width="4" height="18" rx="2" fill="#cbd5e1" />
        </motion.g>
      </svg>
    </div>
  )
}

export function CollaborationIllustration() {
  return (
    <div className="w-56 h-56 mx-auto relative">
      <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Central trip card */}
        <rect x="65" y="70" width="110" height="80" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="75" y="85" width="60" height="8" rx="4" fill="#1e3a5f" />
        <rect x="75" y="100" width="40" height="5" rx="2.5" fill="#cbd5e1" />
        {/* Avatar circles around */}
        <motion.circle
          cx="60" cy="55" r="16" fill="#dbeafe" stroke="#60a5fa" strokeWidth="2"
          animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <text x="60" y="59" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e40af" fontFamily="sans-serif">JD</text>
        <motion.circle
          cx="180" cy="55" r="16" fill="#fef3c7" stroke="#fbbf24" strokeWidth="2"
          animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
        <text x="180" y="59" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e" fontFamily="sans-serif">AK</text>
        <motion.circle
          cx="45" cy="125" r="16" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2"
          animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        />
        <text x="45" y="129" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#065f46" fontFamily="sans-serif">MR</text>
        <motion.circle
          cx="195" cy="125" r="16" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="2"
          animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
        />
        <text x="195" y="129" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#9d174d" fontFamily="sans-serif">SL</text>
        {/* Cursors */}
        <motion.line
          x1="120" y1="110" x2="120" y2="118" stroke="#c8a96a" strokeWidth="2"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        {/* Chat bubble */}
        <rect x="145" y="155" width="60" height="28" rx="8" fill="#1e3a5f" />
        <text x="175" y="173" textAnchor="middle" fontSize="8" fill="white" fontFamily="sans-serif">Let's go!</text>
        {/* Connection lines */}
        <line x1="72" y1="63" x2="88" y2="78" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="168" y1="63" x2="152" y2="78" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="61" y1="117" x2="72" y2="98" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="179" y1="117" x2="168" y2="98" stroke="#e2e8f0" strokeWidth="1" />
      </svg>
    </div>
  )
}
