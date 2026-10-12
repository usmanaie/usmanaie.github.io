/**
 * Colleague reviews. The design only contains placeholder copy, which must never be
 * published. The section and its nav link render only when `enabled` is true AND at
 * least one real, permitted quote is present.
 *
 * OWNER-CONFIRM: supply real quotes (with permission) and set `enabled: true`.
 */
export interface Review {
  quote: string;
  detail: string;
  name: string;
  role: string;
}

export interface ReviewsContent {
  enabled: boolean;
  heading: { lead: string; rest: string };
  note: string;
  items: Review[];
}

export const reviews: ReviewsContent = {
  enabled: false,
  heading: { lead: 'What Colleagues Are', rest: 'Saying About Me' },
  note: 'References are available on request.',
  items: [],
};
