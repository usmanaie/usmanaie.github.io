import { reviewsEnabled } from './reviews-source';

export interface NavItem {
  label: string;
  /** Section id on the home page. */
  id: string;
}

const primary: NavItem[] = [
  { label: 'Home', id: 'top' },
  { label: 'About', id: 'about' },
  { label: 'Expertise', id: 'expertise' },
  { label: 'Projects', id: 'projects' },
  { label: 'Experience', id: 'experience' },
  { label: 'Certifications', id: 'certifications' },
  { label: 'Reviews', id: 'reviews' },
];

const footer: NavItem[] = [
  { label: 'Home', id: 'top' },
  { label: 'Expertise', id: 'expertise' },
  { label: 'Experience', id: 'experience' },
  { label: 'Projects', id: 'projects' },
  { label: 'Reviews', id: 'reviews' },
];

const withReviewsGate = (items: NavItem[]) => items.filter((item) => item.id !== 'reviews' || reviewsEnabled);

export const primaryNav = withReviewsGate(primary);
export const footerNav = withReviewsGate(footer);

/** Anchor href that works from the home page and from sub-pages. */
export function sectionHref(id: string, onHome: boolean): string {
  return onHome ? `#${id}` : `/#${id}`;
}
