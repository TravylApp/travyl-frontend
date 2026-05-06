"use client";

import { ModalShell } from "./ModalShell";
import { PreferenceCarousel } from "./PreferenceCarousel";

interface PlanTripModalProps {
  open: boolean;
  onClose: () => void;
  tripCase: {
    title: string;
    tagline: string;
    prompt: string;
    image: string;
    location: string;
    context: { city: string; country: string };
  };
  onPlan: (prompt: string, context: { city?: string; country?: string }) => void;
}

export function PlanTripModal({
  open,
  onClose,
  tripCase,
  onPlan,
}: PlanTripModalProps) {
  const buildPrompt = (prefs: {
    duration?: string;
    travelers?: string;
    interests?: string[];
    budget?: string;
    pace?: string;
  }) => {
    const parts: string[] = [tripCase.prompt];
    if (tripCase.location) parts.push(`to ${tripCase.location}`);
    if (prefs.duration) parts.push(prefs.duration);
    if (prefs.travelers) parts.push(prefs.travelers);
    if (prefs.interests?.length)
      parts.push(`interested in ${prefs.interests.join(", ").toLowerCase()}`);
    if (prefs.budget) parts.push(prefs.budget.toLowerCase());
    if (prefs.pace) parts.push(prefs.pace.toLowerCase());
    return parts.join(", ");
  };

  const handleSubmit = (prefs: Record<string, any>) => {
    const prompt = buildPrompt(prefs);
    onPlan(prompt, tripCase.context);
    onClose();
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <PreferenceCarousel
        tripTitle={tripCase.title}
        tripTagline={tripCase.tagline}
        location={tripCase.location}
        image={tripCase.image}
        onSubmit={handleSubmit}
      />
    </ModalShell>
  );
}
