import { reviewsFixture } from '../../tests/fixtures/reviews';
import { type ReviewsContent, reviews } from './reviews';

/**
 * Resolves which reviews data the build uses.
 *
 * Production always uses content/reviews.ts. The test-only fixture build
 * (PUBLIC_REVIEWS_FIXTURE=true -> dist-fixture/, noindex, never deployed) swaps in
 * placeholder data so the carousel can be exercised by e2e and visual tests.
 * scripts/check-dist.mjs fails the production build if placeholder copy leaks.
 */
const useFixture = import.meta.env['PUBLIC_REVIEWS_FIXTURE'] === 'true';

export const reviewsContent: ReviewsContent = useFixture ? reviewsFixture : reviews;
export const reviewsEnabled = reviewsContent.enabled && reviewsContent.items.length > 0;
