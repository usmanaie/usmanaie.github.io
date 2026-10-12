import { numberToWord, yearsOfExperience } from './site';

export interface ExperienceItem {
  role: string;
  /** Human-readable date range shown in the pill. */
  period: string;
  /** Machine-readable start for <time datetime>. */
  start: string;
  /** Shown as written; includes the organisation where the design does. */
  summary: string;
}

export const experience: {
  heading: { lead: string; accent: string };
  intro: string;
  numeral: string;
  cta: string;
  items: ExperienceItem[];
} = {
  heading: { lead: 'Pushing Boundaries', accent: 'Since 2022' },
  intro: `${numberToWord(yearsOfExperience)} years of designing, building and leading the delivery of intelligent, enterprise-grade systems on Google Cloud.`,
  numeral: `${yearsOfExperience}+`,
  cta: 'GET STARTED',
  /** OWNER-CONFIRM: certification date ("Jun 2026"). */
  items: [
    {
      role: 'Lead Software Engineer',
      period: 'May 2024 – Present',
      start: '2024-05',
      summary: 'Z-Axiss SMC · Leading multi-agent AI, RAG and governance delivery on GCP.',
    },
    {
      role: 'Software Engineer',
      period: 'May 2022 – 2024',
      start: '2022-05',
      summary: 'Z-Axiss SMC · Built a telehealth platform, enterprise APIs and ETL pipelines.',
    },
    {
      role: 'Professional Cloud Developer',
      period: 'Google · Jun 2026',
      start: '2026-06',
      summary: 'Google Cloud certified, alongside ADK, RAG and Vertex AI evaluation credentials.',
    },
  ],
};
