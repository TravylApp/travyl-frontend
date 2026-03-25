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

      if (user) {
        try {
          const tripId = await savePlanToSupabase(plan as any)
          onClose()
          router.push(`/trip/${tripId}`)
        } catch {
          onClose()
          router.push('/trips')
        }
      } else {
        // Not logged in — store plan and redirect to preview
        try {
          sessionStorage.setItem('pendingPlan', JSON.stringify(plan))
        } catch { /* ignore */ }
        onClose()
        router.push('/trip/preview')
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
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
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          ESC
        </kbd>
      </div>

      {/* Content */}
      <div className="px-5 py-4 max-h-[400px] overflow-y-auto">
        {/* Extracting phase */}
        {(phase === 'idle' || phase === 'extracting') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Understanding your trip...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[280px]">
                &quot;{prefillDestination ? `trip to ${prefillDestination}` : query || 'plan a trip'}&quot;
              </p>
            </div>
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          </motion.div>
        )}

        {/* Clarifying phase */}
        {isClarifying && currentQuestion && (
          <div className="space-y-4">
            {/* Question header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Question {currentQIdx + 1} of {questions.length}
                </span>
              </div>
              {/* Progress dots */}
              <div className="flex items-center gap-1">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i <= currentQIdx ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
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
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {currentQuestion.question}
                </h3>

                {/* Option cards */}
                <div className="space-y-2">
                  {currentQuestion.options.map((option, i) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === option
                    const letter = LETTERS[i] ?? String(i + 1)

                    return (
                      <button
                        key={`${currentQuestion.id}-${i}`}
                        onClick={() => handleOptionSelect(currentQuestion.id, option)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="flex-1">{option}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Keyboard hint */}
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
                  Press {currentQuestion.options.map((_, i) => LETTERS[i]).join('/')} or {currentQuestion.options.map((_, i) => String(i + 1)).join('/')} to select
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
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Planning your trip to {destination}...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Building itinerary, finding hotels and flights
              </p>
            </div>
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          </motion.div>
        )}

        {/* Complete phase — show brief saving state */}
        {phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Saving your trip...
              </p>
            </div>
            <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
          </motion.div>
        )}

        {/* Error phase */}
        {phase === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Something went wrong
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[280px]">
                {planner.state.phase === 'error' ? planner.state.message : 'An unexpected error occurred'}
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </div>

      {/* Subtle bottom glow */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
    </motion.div>
  )
}
