# Demo Day Feedback — March 27, 2026

## Scores

| Metric | Avg | Min | Max |
|---|---|---|---|
| Demo quality | 4.3/5 | 3 | 5 |
| Core functionality | 4.2/5 | 3 | 5 |
| New user difficulty | 3.5/5 (lower = easier) | 1 | 5 |
| UI quality | 4.4/5 | 2 | 5 |
| Completeness | 73% | 45% | 90% |
| Would use it | 3.9/5 | 1 | 5 |

## What People Loved
- "It was just so clean and they actually just let us use it"
- "The UI design is fantastic"
- "I love how you can personalize it, like dark mode and change the colors of the icons"
- "Being able to plan a trip easily"
- "User interface, very responsive and good to look at"
- "The ability to collaborate in the budgets, planning what to pack and calendar section"
- "All the different options to look through and helping functionality"
- "The website looks professional and is running on a separate hosting instance"

## What People Didn't Like / Issues Found

### CRITICAL — Already in our audit
| Feedback | Audit Item | Priority |
|---|---|---|
| "Making the main link work with the API" | B1: CloudFront 403 on deployed site | Critical |
| "The flight page" needs most work | 7.1: Flight search tabs don't filter | High |
| "Mobile functionality" needs work | M7-M14: Multiple mobile issues | High |
| "Some things don't load" | API routes returning 404/500 on deployed | Critical |

### HIGH — New from feedback
| Feedback | What to Fix | Priority |
|---|---|---|
| "4 questions no matter what — should have skip option" | Already implementing: multi-select + skip | High |
| "Showed Universal Studios Orlando in places in New Delhi" | Location filtering broken — results from wrong cities | High |
| "Images are low res and not clickable" | Upscale Google thumbnails + make cards clickable | High |
| "Places are too far apart" — location consistency | Search results mixing distant locations | High |
| "Font color on some text" hard to read | Contrast audit needed | Medium |
| "No option for staying with someone / having a house" | Add more accommodation types to questions | Medium |
| Itinerary loads on 2nd prompt (not 1st) | Trip planner state machine — generating phase triggers too late | High |
| "Spend a week in Georgia" — ambiguous (state vs country) | Backend should detect ambiguity and ask clarifying question | High |
| Mobile itinerary cards broken/inconsistent, duplicates | Mobile card formatting + dedup logic | High |
| Mobile Explore shows twice, only 2nd works | Duplicate Explore section rendering on mobile | High |
| Obscure locations not found in API | Location API not exhaustive — add fallback or "not found" UX | Medium |

### MEDIUM — Polish
| Feedback | What to Fix | Priority |
|---|---|---|
| "More enforcement on login — non-logged-in users can see other people's trips" | Trip visibility/RLS not enforced | Medium |
| "Keep map language consistent with user locale" | Leaflet tiles language | Medium |
| "Address travel advisories to less than safe locations" | Safety info on destination | Medium |
| "Filtering on some photos provided" | Photo content moderation | Low |
| "Price conversion for different countries/currency" | Wire /api/exchange-rates | Medium |
| "Make it so you can request specific things" | NLP search everywhere | Medium |
| "A lot to look through at first" — overwhelming | Better onboarding/tour | Low |

## Action Items Mapped to Week 1

1. ✅ Skip + multi-select on questions (already implementing)
2. 🔴 Fix location filtering — wrong city results (Universal Studios in New Delhi)
3. 🔴 Fix deployed site API (CloudFront 403, missing env vars)
4. 🔴 Image quality — upscale thumbnails, make cards clickable
5. 🟡 Flight page improvements
6. 🟡 Mobile functionality
7. 🟡 Currency conversion
8. 🟡 Text contrast audit
