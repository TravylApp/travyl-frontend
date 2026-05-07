import type { DayStory, DayStoryRequest } from '../types';

/**
 * Pure, deterministic templated DayStory. Used as both a fallback when
 * Bedrock is unavailable and as the Phase-1 stand-in before Bedrock ships.
 */
export function buildTemplatedDayStory(req: DayStoryRequest): DayStory {
  const dest = req.destination || 'your trip';
  const acts = req.activities;

  // Empty days → suggestion-flavor
  if (acts.length === 0) {
    return {
      headline: `A blank page worth <em>filling</em>`,
      narrative: req.isFirstDay
        ? `Day one in ${dest} — nothing planned yet, and that's fine. Pick a starting moment and we'll build out from there.`
        : req.isLastDay
          ? `Your last full day in ${dest} — still room to slow down or sneak in something memorable before the trip home.`
          : `Nothing on the books for this day yet. Most travelers spend it nearby — want a starting point?`,
      source: 'template',
    };
  }

  const first = acts[0];
  const featuredIdx = pickFeaturedIndex(acts);
  const featured = acts[featuredIdx];

  let headline: string;
  let narrative: string;

  if (req.isFirstDay) {
    headline = `${first.name} <em>and beyond</em>`;
    narrative = `A soft landing in ${dest}. Wheels touching down and your first plate of something local. ${featured.name} anchors the day.`;
  } else if (req.isLastDay) {
    narrative = `One last lap before home. Don't rush ${featured.name}.`;
    headline = `One last <em>lap</em>`;
  } else {
    const lead = first.name;
    const tail = featured.name === first.name ? '' : ` — and later, ${featured.name}.`;
    headline = `Today: ${first.name.split(' ').slice(0, 3).join(' ')} <em>and beyond</em>`;
    narrative = `Begin with ${lead}${tail}`;
  }

  return {
    headline,
    narrative,
    featuredActivityIndex: featuredIdx,
    featuredImageUrl: featured.image,
    source: 'template',
  };
}

/**
 * Pick the most visually-interesting moment to feature. Heuristic:
 * prefer activities that have an image, then the first non-transport,
 * else fall back to the first.
 */
function pickFeaturedIndex(acts: DayStoryRequest['activities']): number {
  const withImage = acts.findIndex((a) => !!a.image);
  if (withImage >= 0) return withImage;
  const nonTransport = acts.findIndex((a) => a.type !== 'transport' && a.type !== 'flight');
  if (nonTransport >= 0) return nonTransport;
  return 0;
}
