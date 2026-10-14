import type { ImageMetadata } from 'astro';

import agenticShot from '../assets/projects/agentic-ai.png';
import governanceShot from '../assets/projects/ai-governance.png';
import telehealthShot from '../assets/projects/telehealth.png';
import dairectorShot from '../assets/projects/dairector.png';
import satoriShot from '../assets/projects/satori.png';

export interface Project {
  slug: string;
  eyebrow: string;
  /** "bright" is the design's middle row: lighter eyebrow, brighter copy, filled CTA. */
  tone: 'standard' | 'bright';
  title: string;
  summary: string;
  bullets: string[];
  image: ImageMetadata;
  imageAlt: string;
}

export const projectsSection = {
  heading: { lead: 'Systems I’ve Helped', accent: 'Bring to Life' },
  intro:
    'A selection of platforms that show how I approach system design, AI integration, delivery and scale across regulated domains.',
  viewAll: 'VIEW ALL',
  caseStudy: 'VIEW CASE STUDY',
};

export const projects: Project[] = [
  {
    slug: 'dairector',
    eyebrow: 'AI VIDEO STUDIO',
    tone: 'standard',
    title: 'Dairector',
    summary:
      'An AI studio in a box: describe a video in a few plain lines, and a crew of AI agents writes, voices, designs, edits and reviews it in one conversation, on brand and within budget.',
    bullets: [
      'A crew of AI agents in one conversation',
      'On brand, every spend held to a budget',
      'Presenter videos from a single photo',
    ],
    image: dairectorShot,
    imageAlt:
      'Illustration of the Dairector studio on a dark stage: a brief in the conversation, the crew of AI agents ticking off their steps, a video frame reading Your team’s favourite blend with its scenes, voice and budget below, a brand palette card, and a presenter drawn on camera from one photo.',
  },
  {
    slug: 'satori',
    eyebrow: 'ENTERPRISE ANALYTICS',
    tone: 'standard',
    title: 'Satori',
    summary:
      'A decision-support platform that turns a cloud data warehouse into the reports, dashboards and scheduled briefings an executive team runs on, with an assistant that answers in plain language.',
    bullets: [
      'Reports that match in the browser and the inbox',
      'Row-level access down to a single district',
      'An AI assistant that never writes its own SQL',
    ],
    image: satoriShot,
    imageAlt:
      'Illustration of the Satori console on a dark stage: a report sheet with a trend chart and a figures table, a panel scheduling that sheet to a list of recipients, and an assistant answering a typed question with a figure drawn from the same report.',
  },
  {
    slug: 'multi-agent-ai-platform',
    eyebrow: 'AGENTIC AI',
    tone: 'standard',
    title: 'Multi-Agent AI Platform',
    summary:
      'Autonomous, tool-using agents built with Google ADK, MCP and the Agent2Agent protocol, integrating securely with live enterprise infrastructure.',
    bullets: ['Autonomous, tool-using agents', 'Secure MCP integrations', 'Agent-to-agent collaboration (A2A)'],
    image: agenticShot,
    imageAlt:
      'Illustration of a laptop on a dark perforated wall, its screen showing an orange agent graph: a central orchestrator node connected to several tool nodes.',
  },
  {
    slug: 'enterprise-telehealth-platform',
    eyebrow: 'TELEHEALTH',
    tone: 'bright',
    title: 'Enterprise Telehealth Platform',
    summary:
      'A multi-stakeholder platform for patients, providers, pharmacies and labs, with e-prescriptions, payments and real-time secure communication.',
    bullets: ['e-Prescriptions via DoseSpot', 'Payments with 1Merchant', 'Real-time chat with TalkJS & Twilio'],
    image: telehealthShot,
    imageAlt:
      'Illustration of a laptop on a light studio set showing a Telehealth Operations dashboard with appointment, e-prescription, lab order and payment tiles, a visit analytics chart and a live care-team gauge.',
  },
  {
    slug: 'responsible-ai-governance',
    eyebrow: 'AI GOVERNANCE',
    tone: 'standard',
    title: 'Responsible AI Governance',
    summary:
      'HIPAA, SOC 2 and GDPR-aligned policy control frameworks that let regulated organisations adopt generative AI responsibly and at scale.',
    bullets: ['HIPAA · SOC 2 · GDPR controls', 'RAG pipelines on Vertex AI', 'Production-ready by design'],
    image: governanceShot,
    imageAlt:
      'Illustration of a phone resting on grey stone, showing a governance app with a Policy checks passing status and enabled HIPAA, SOC 2 and GDPR toggles.',
  },
];
