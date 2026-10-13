import linesquareLogo from '../assets/experience/linesquare.jpg';
import tmcLogo from '../assets/experience/tmc.jpg';
import trilloLogo from '../assets/experience/trillo.jpg';
import zaxissLogo from '../assets/experience/zaxiss.jpg';
import { numberToWord, yearsOfExperience } from './site';

/** One role at a company. Dates are 'YYYY-MM'; no `end` means it is current. */
export interface ExperienceRole {
  title: string;
  start: string;
  end?: string;
  summary: string;
}

/** A company with one or more roles, newest first (as on LinkedIn). */
export interface ExperienceCompany {
  company: string;
  logo: ImageMetadata;
  location: string;
  workplace: 'On-site' | 'Remote';
  roles: ExperienceRole[];
  /** Kept for the record but not shown on the site (owner's choice). */
  hidden?: boolean;
}

export const experience: {
  heading: { lead: string; accent: string };
  intro: string;
  numeral: string;
  cta: string;
  companies: ExperienceCompany[];
} = {
  heading: { lead: 'Pushing Boundaries', accent: 'Since 2022' },
  intro: `${numberToWord(yearsOfExperience)} years of designing, building and leading the delivery of intelligent, enterprise-grade systems on Google Cloud.`,
  numeral: `${yearsOfExperience}+`,
  cta: 'GET STARTED',
  /**
   * From the owner's LinkedIn profile (AiMarks left out at the owner's request). The TMC,
   * Trillo and LineSquare summaries describe the role in general terms (LinkedIn shows none).
   */
  companies: [
    {
      company: 'TMC (TallyMarks Consulting)',
      logo: tmcLogo,
      location: 'Lahore, Pakistan',
      workplace: 'On-site',
      roles: [
        {
          title: 'Lead AI Engineer',
          start: '2026-07',
          summary:
            'Leading the design and delivery of agentic AI solutions on Google Cloud, from architecture and evaluation through to production, and guiding the engineering team on AI best practices.',
        },
      ],
    },
    {
      company: 'Z-Axiss',
      logo: zaxissLogo,
      location: 'Islamabad, Pakistan',
      workplace: 'On-site',
      roles: [
        {
          title: 'Lead Software Engineer',
          start: '2024-05',
          end: '2026-07',
          summary:
            'Designing and delivering production-grade agentic AI systems and leading the technical direction of the engineering team.',
        },
        {
          title: 'Junior Software Engineer',
          start: '2022-05',
          end: '2024-04',
          summary:
            'Contributed to the design and delivery of enterprise backend systems and APIs across multiple product domains using Java, Python and GCP.',
        },
      ],
    },
    {
      company: 'Trillo Inc.',
      logo: trilloLogo,
      hidden: true,
      location: 'California, United States',
      workplace: 'Remote',
      roles: [
        {
          title: 'Software Engineer',
          start: '2022-08',
          end: '2026-07',
          summary:
            'Built and maintained cloud platform features and APIs, bringing AI and generative AI capabilities into enterprise applications.',
        },
      ],
    },
    {
      company: 'LineSquare Technologies',
      logo: linesquareLogo,
      hidden: true,
      location: 'Islamabad, Pakistan',
      workplace: 'On-site',
      roles: [
        {
          title: 'Android Developer',
          start: '2022-02',
          end: '2022-04',
          summary:
            'Developed and tested Android app features in Java, from UI screens and API integration to bug fixes, working closely with the product team.',
        },
      ],
    },
  ],
};

/** The companies shown on the site (owner: TMC and Z-Axiss only). */
export const shownCompanies = experience.companies.filter((c) => !c.hidden);
