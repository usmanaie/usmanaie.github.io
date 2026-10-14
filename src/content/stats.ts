import { yearsOfExperience } from './site';

export interface Stat {
  value: string;
  label: string;
  accent: boolean;
}

/** Owner-provided figures (Oct 2026). "Years" derives from CAREER_START in site.ts. */
export const stats: Stat[] = [
  { value: `${yearsOfExperience}+`, label: 'Years of Experience', accent: true },
  { value: '25+', label: 'Google Cloud Badges', accent: false },
  { value: '10+', label: 'Platform Integrations', accent: false },
  { value: '5+', label: 'Industry Domains', accent: true },
  { value: '5+', label: 'Products Launched', accent: false },
];
