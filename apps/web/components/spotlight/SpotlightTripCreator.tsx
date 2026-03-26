'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { useTripPlanner, useAuthStore } from '@travyl/shared'
import type { FollowUpQuestion, PlanResponse } from '@travyl/shared'
import { savePlanToSupabase } from '@travyl/shared/src/services/api'

interface Props {
  prefillDestination: string
  query: string
  onClose: () => void
  onBack: () => void
  onPhaseChange?: (phase: string) => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function SpotlightTripCreator({ prefillDestination, query, onClose, onBack, onPhaseChange }: Props) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const planner = useTripPlanner()
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const isSaving = useRef(false)
  const hasStarted = useRef(false)

  const phase = planner.state.phase
  const isClarifying = phase === 'clarifying'
  const questions: FollowUpQuestion[] = planner.state.phase === 'clarifying' ? planner.state.questions : []
  const currentQuestion = questions[currentQIdx] ?? null

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(phase)
  }, [phase, onPhaseChange])

  // Auto-start extraction on mount
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const prompt = prefillDestination
      ? `trip to ${prefillDestination}`
      : query || 'plan a trip'

    planner.submitPrompt(prompt)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle selecting an answer option
  const handleOptionSelect = useCallback((questionId: string, option: string) => {
    const newAnswers = { ...selectedAnswers, [questionId]: option }
    setSelectedAnswers(newAnswers)

    // Auto-advance to next question after a brief pause
    if (currentQIdx < questions.length - 1) {
      setTimeout(() => setCurrentQIdx((i) => i + 1), 400)
    } else {
      // All questions answered — submit to plan
      setTimeout(() => {
        planner.submitAnswers(newAnswers)
      }, 600)
    }
  }, [selectedAnswers, currentQIdx, questions.length, planner])

  // Expose selectByIndex for keyboard handling from parent
  const selectByIndex = useCallback((idx: number) => {
    if (!isClarifying || !currentQuestion) return
    const opts = currentQuestion.options
    if (idx >= 0 && idx < opts.length) {
      handleOptionSelect(currentQuestion.id, opts[idx])
    }
  }, [isClarifying, currentQuestion, handleOptionSelect])

  // Attach selectByIndex to a ref so parent can call it
  useEffect(() => {
    (window as any).__spotlightSelectByIndex = selectByIndex
    return () => {
      delete (window as any).__spotlightSelectByIndex
    }
  }, [selectByIndex])

  // When plan completes — save and navigate
  useEffect(() => {
    if (planner.state.phase !== 'complete' || isSaving.current) return
    isSaving.current = true
    const plan = planner.state.plan

    ;(async () => {
      if (!plan?.extracted) {
        onClose()
        router.push('/trips')
        return
      }

      try {
        const tripId = await savePlanToSupabase(plan as any)
        onClose()
        router.push(`/trip/${tripId}`)
      } catch {
        onClose()
        router.push('/trips')
      }
    })()
  }, [planner.state.phase, planner.state, user, onClose, router])

  const handleRetry = useCallback(() => {
    setCurrentQIdx(0)
    setSelectedAnswers({})
    isSaving.current = false
    const prompt = prefillDestination
      ? `trip to ${prefillDestination}`
      : query || 'plan a trip'
    planner.submitPrompt(prompt)
  }, [prefillDestination, query, planner])

  const destination = prefillDestination || 'your destination'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            AI Trip Planner
          </span>
        </div>
        {isClarifying && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {currentQIdx + 1}/{questions.length}
          </span>
        )}
      </div>

      {/* Content — glassmorphism container */}
      <div className="px-4 py-4 max-h-[400px] overflow-y-auto">
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 dark:from-slate-950/95 dark:to-gray-900/95 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl">

          {/* Extracting phase */}
          {(phase === 'idle' || phase === 'extracting') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold text-white">
                  Understanding your trip...
                </p>
                <p className="text-xs text-white/50 max-w-[280px]">
                  &quot;{prefillDestination ? `trip to ${prefillDestination}` : query || 'plan a trip'}&quot;
                </p>
              </div>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          {/* Clarifying phase */}
          {isClarifying && currentQuestion && (
            <div className="space-y-3">
              {/* Question header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-xs font-medium text-white/50">
                    Question {currentQIdx + 1} of {questions.length}
                  </span>
                </div>
                {/* Progress dots */}
                <div className="flex items-center gap-1.5">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                        i < currentQIdx
                          ? 'bg-emerald-400'
                          : i === currentQIdx
                            ? 'bg-indigo-400'
                            : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Animated question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQIdx}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-white">
                    {currentQuestion.question}
                  </h3>

                  {/* Option cards — glassmorphism style */}
                  <div className="grid gap-2">
                    {currentQuestion.options.map((option, i) => {
                      const isSelected = selectedAnswers[currentQuestion.id] === option
                      const letter = LETTERS[i] ?? String(i + 1)

                      return (
                        <motion.button
                          key={`${currentQuestion.id}-${i}`}
                          onClick={() => handleOptionSelect(currentQuestion.id, option)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all duration-200 ${
                            isSelected
                              ? 'bg-[#1e3a5f] text-white shadow-lg shadow-blue-500/20'
                              : 'bg-white/[0.07] text-white/80 hover:bg-white/[0.13] border border-white/[0.08]'
                          }`}
                        >
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-white/[0.08] text-white/50'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="font-medium flex-1">{option}</span>
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Keyboard hint */}
                  <p className="text-[10px] text-white/30 text-center pt-1">
                    Press {currentQuestion.options.map((_, i) => LETTERS[i]).join('/')} to select
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Planning phase */}
          {phase === 'planning' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold text-white">
                  Planning your trip to {destination}...
                </p>
                <p className="text-xs text-white/40">
                  Building itinerary, finding hotels and flights
                </p>
              </div>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          {/* Complete phase — show brief saving state */}
          {phase === 'complete' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold text-white">
                  Your trip is ready!
                </p>
                <p className="text-xs text-white/40">
                  Saving and redirecting...
                </p>
              </div>
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            </motion.div>
          )}

          {/* Error phase */}
          {phase === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold text-white">
                  Something went wrong
                </p>
                <p className="text-xs text-white/40 max-w-[280px]">
                  {planner.state.phase === 'error' ? planner.state.message : 'An unexpected error occurred'}
                </p>
              </div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Subtle bottom glow */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
    </motion.div>
  )
}
