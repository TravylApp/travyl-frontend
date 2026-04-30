'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Xmark, NavArrowRight, NavArrowLeft } from 'iconoir-react'
import { useProfile, useAuthStore, updateProfile } from '@travyl/shared'
import { LogoIllustration, SearchIllustration, CalendarIllustration, CollaborationIllustration } from './Illustrations'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

interface Step {
  title: string
  subtitle: string
  illustration: React.ReactNode
}

const steps: Step[] = [
  {
    title: 'Welcome to Travyl',
    subtitle: 'Your AI-powered travel companion. Plan trips, build itineraries, and explore the world — all in one place.',
    illustration: <LogoIllustration />,
  },
  {
    title: 'Plan Your First Trip',
    subtitle: 'Just enter a destination and let our AI trip planner generate a personalized itinerary with flights, hotels, and activities.',
    illustration: <SearchIllustration />,
  },
  {
    title: 'Build Your Itinerary',
    subtitle: 'Drag and drop activities on your calendar. Move things around, add notes, and share with friends to perfect your plan.',
    illustration: <CalendarIllustration />,
  },
  {
    title: 'Travel Together',
    subtitle: 'Invite friends to collaborate in real time. Vote on activities, leave notes, and plan as a group — no more endless chat threads.',
    illustration: <CollaborationIllustration />,
  },
]

export function OnboardingOverlay() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isDismissing, setIsDismissing] = useState(false)
  const user = useAuthStore((s) => s.user)
  const { data: profile, isLoading } = useProfile()

  const completeOnboarding = useCallback(async () => {
    if (!user) return
    try {
      await updateProfile(user.id, { onboarding_completed: true })
    } catch {
      // Silently fail — user can see onboarding again later
    }
  }, [user])

  const handleDismiss = useCallback(async () => {
    setIsDismissing(true)
    await completeOnboarding()
  }, [completeOnboarding])

  const handleFinish = useCallback(async () => {
    setIsDismissing(true)
    await completeOnboarding()
  }, [completeOnboarding])

  // Don't show if not loaded, not authenticated, or already completed
  if (isLoading || !user || profile?.onboarding_completed) return null
  if (isDismissing) return null

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-[#1e3a5f]/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
        />

        {/* Card */}
        <motion.div
          className="relative w-full max-w-md mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-gray-100 transition-colors"
            aria-label="Dismiss onboarding"
          >
            <Xmark className="w-4 h-4 text-gray-500" />
          </button>

          {/* Illustration area */}
          <div className="bg-gradient-to-br from-[#f8fafc] to-[#e0f2fe] pt-12 pb-8 px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
              >
                {step.illustration}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="px-8 pt-6 pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              >
                <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3 text-center">
                  {step.title}
                </h2>
                <p className="text-gray-500 text-center leading-relaxed text-sm">
                  {step.subtitle}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer: dots + buttons */}
          <div className="px-8 pb-8">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: idx === currentStep ? 24 : 8,
                    height: 8,
                    backgroundColor: idx === currentStep ? '#1e3a5f' : '#cbd5e1',
                  }}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
                  aria-label="Previous step"
                >
                  <NavArrowLeft className="w-5 h-5" />
                </button>
              )}

              {isLast ? (
                <button
                  onClick={handleFinish}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e3a5f] text-white font-semibold hover:bg-[#2a4a6f] transition-colors shadow-lg shadow-[#1e3a5f]/20"
                >
                  Get Started
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep((s) => s + 1)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e3a5f] text-white font-semibold hover:bg-[#2a4a6f] transition-colors shadow-lg shadow-[#1e3a5f]/20"
                >
                  Next
                  <NavArrowRight className="w-5 h-5" />
                </button>
              )}

              {/* Skip for non-last steps */}
              {!isLast && (
                <button
                  onClick={handleDismiss}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-2"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
