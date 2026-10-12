import type { ReviewsContent } from '../../src/content/reviews';

/**
 * TEST FIXTURE ONLY. Mirrors the design's placeholder cards so the carousel can be
 * tested and visually compared. Never shipped: production builds use src/content/reviews.ts
 * and scripts/check-dist.mjs rejects any build containing these strings.
 */
const base = {
  detail: '[One or two sentences of supporting context from the reference.]',
  name: '[Name]',
  role: '[Role, Company]',
};

export const reviewsFixture: ReviewsContent = {
  enabled: true,
  heading: { lead: 'What Colleagues Are', rest: 'Saying About Me' },
  note: 'References are available on request. These cards are placeholders for real quotes from people I’ve worked with.',
  items: [
    { quote: '[A short, real quote from a colleague.]', ...base },
    { quote: '[A short, real quote from a client.]', ...base },
    { quote: '[A short, real quote from a manager.]', ...base },
    { quote: '[A short, real quote from a mentee.]', ...base },
    { quote: '[A short, real quote from a partner.]', ...base },
  ],
};
