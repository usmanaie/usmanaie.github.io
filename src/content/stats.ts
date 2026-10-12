import { yearsOfExperience } from './site';

export interface Stat {
  value: string;
  label: string;
  accent: boolean;
}

/** OWNER-CONFIRM: every figure below. "Years" derives from CAREER_START in site.ts. */
export const stats: Stat[] = [
  { value: `${yearsOfExperience}+`, label: 'Years of Experience', accent: true },
  { value: '8', label: 'Certifications Earned', accent: false },
  { value: '7', label: 'Platform Integrations', accent: false },
  { value: '3', label: 'Compliance Frameworks', accent: true },
  { value: '3', label: 'Industry Domains', accent: false },
];
