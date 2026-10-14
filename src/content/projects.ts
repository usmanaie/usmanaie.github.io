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
  /** The case study's feature chips. */
  features: string[];
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
    features: [
      'AI crew of agents',
      'Guided & Express modes',
      'Scriptwriting',
      'Voice-over',
      'Motion design',
      'Video editing',
      'AI review',
      'Brand on every video',
      'Budgets & spend caps',
      'Presenter from one photo',
      '16:9 · 9:16 · 1:1',
      'Invite-only workspaces',
      'Google sign-in',
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
    features: [
      'User management',
      'Role-based access (RBAC)',
      'Organisation management',
      'AI Report Builder',
      'AI Dashboard Builder',
      'Q&A assistant',
      'Broadcasting',
      'Row-level security',
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
    features: [
      'Persona orchestration',
      'Business discovery',
      'Profile builder',
      'Due diligence',
      'Document summariser',
      'Document management',
      'Multi-tenancy',
      'User management',
      'In-app chat',
      'MCP integrations',
      'Agent-to-agent (A2A)',
    ],
    image: agenticShot,
    imageAlt:
      'Illustration of a deal room console on a dark stage: a persona orchestrator agent directing business discovery, profile maker and due diligence agents over A2A, beside the buyer persona, the businesses found and a due diligence checklist, with MCP tools and a deal memo ready for review.',
  },
  {
    slug: 'enterprise-telehealth-platform',
    eyebrow: 'TELEHEALTH',
    tone: 'bright',
    title: 'Enterprise Telehealth Platform',
    summary:
      'A multi-stakeholder platform for patients, providers, pharmacies and labs, with e-prescriptions, payments and real-time secure communication.',
    bullets: ['e-Prescriptions via DoseSpot', 'Payments with 1Merchant', 'Real-time chat with TalkJS & Twilio'],
    features: [
      'Patients, providers, pharmacies & labs',
      'Appointments',
      'e-Prescriptions (DoseSpot)',
      'Lab orders',
      'Payments (1Merchant)',
      'Real-time chat (TalkJS & Twilio)',
    ],
    image: telehealthShot,
    imageAlt:
      'Illustration of a telehealth operations console on a dark stage: appointment, e-prescription, lab order and payment tiles, a secure video visit beside its secure chat, a prescription sent to the pharmacy and a lab order, with a payment received and the patient’s confirmed visit on a phone.',
  },
  {
    slug: 'responsible-ai-governance',
    eyebrow: 'AI GOVERNANCE',
    tone: 'standard',
    title: 'Responsible AI Governance',
    summary:
      'Policy control frameworks that let regulated organisations adopt generative AI responsibly and at scale: custom policies set by zone and region and enforced by every department, on top of HIPAA, SOC 1, SOC 2 and GDPR controls.',
    bullets: [
      'Custom policies per zone, region and department',
      'HIPAA · SOC 1 & 2 · GDPR controls',
      'RAG pipelines on Vertex AI, production-ready',
    ],
    features: [
      'SOC 1 & SOC 2',
      'HIPAA',
      'GDPR',
      'Custom policy enforcement',
      'Zone, region & department policies',
      'User management',
      'Dictation',
      'Multi-model queries',
      'RAG on Vertex AI',
    ],
    image: governanceShot,
    imageAlt:
      'Illustration of an AI governance console on a dark stage: HIPAA, SOC 1, SOC 2 and GDPR controls passing, a custom policy tree from zone to region to departments each enforcing its own policy, a RAG pipeline on Vertex AI gated by the department policy, and an audit trail, with a declined request and a grounded answer.',
  },
];
