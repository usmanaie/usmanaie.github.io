import type { ImageMetadata } from 'astro';

import agenticShot from '../assets/projects/agentic-ai.png';
import governanceShot from '../assets/projects/ai-governance.png';
import telehealthShot from '../assets/projects/telehealth.png';
import dairectorShot from '../assets/projects/dairector.png';
import satoriShot from '../assets/projects/satori.png';
import loadPlanningShot from '../assets/projects/load-planning.png';
import palletShot from '../assets/projects/pallet-verification.png';

export interface Project {
  slug: string;
  eyebrow: string;
  /** "bright" is the design's middle row: lighter eyebrow, brighter copy, filled CTA. */
  tone: 'standard' | 'bright';
  /**
   * The project's place on the home page (1 to 3: the design's three rows, the bright one in the middle). Projects
   * without one are on /projects only, which shows every project in list order.
   */
  featured?: number;
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
    eyebrow: 'MEDIA & MARKETING',
    tone: 'standard',
    featured: 1,
    title: 'Dairector',
    summary:
      'An AI video studio where specialised agents script, voice, design, edit and review each video from a short brief, keeping every output on brand and within budget.',
    bullets: [
      'Multi-agent production in one conversation',
      'Brand governance and budget controls',
      'Presenter videos from a single photo',
    ],
    features: [
      'Multi-agent production',
      'Guided & Express modes',
      'Scriptwriting',
      'Voice-over',
      'Motion design',
      'Video editing',
      'AI review',
      'Brand governance',
      'Budgets & spend caps',
      'Presenter videos from one photo',
      '16:9 · 9:16 · 1:1',
      'Invite-only workspaces',
      'Google single sign-on',
    ],
    image: dairectorShot,
    imageAlt:
      'Illustration of the Dairector studio on a dark stage: a brief in the conversation, the crew of AI agents ticking off their steps, a video frame reading Your team’s favourite blend with its scenes, voice and budget below, a brand palette card, and a presenter drawn on camera from one photo.',
  },
  {
    slug: 'satori',
    eyebrow: 'BUSINESS INTELLIGENCE',
    tone: 'standard',
    title: 'Satori',
    summary:
      'A decision-support platform that turns an enterprise data warehouse into reports, dashboards and scheduled executive briefings, with a natural-language assistant for instant answers.',
    bullets: [
      'Consistent reports on screen and by email',
      'Row-level security down to district level',
      'Governed AI assistant built on approved reports',
    ],
    features: [
      'User management',
      'Role-based access (RBAC)',
      'Organisation management',
      'AI report builder',
      'AI dashboard builder',
      'Natural-language Q&A',
      'Scheduled report distribution',
      'Row-level security',
    ],
    image: satoriShot,
    imageAlt:
      'Illustration of the Satori console on a dark stage: a report sheet with a trend chart and a figures table, a panel scheduling that sheet to a list of recipients, and an assistant answering a typed question with a figure drawn from the same report.',
  },
  {
    slug: 'multi-agent-ai-platform',
    eyebrow: 'MERGERS & ACQUISITIONS',
    tone: 'standard',
    featured: 3,
    title: 'Multi-Agent AI Platform',
    summary:
      'A multi-agent platform built with Google ADK that helps buyers acquire a business: an orchestrator coordinates agents for discovery, profiling and due diligence over A2A and MCP.',
    bullets: [
      'Persona-driven business discovery',
      'Automated profiling and due diligence',
      'Secure MCP tools and A2A collaboration',
    ],
    features: [
      'Persona orchestration',
      'Business discovery',
      'Business profiling',
      'Due diligence',
      'Document summarisation',
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
    eyebrow: 'HEALTHCARE',
    tone: 'bright',
    featured: 2,
    title: 'Enterprise Telehealth Platform',
    summary:
      'A multi-tenant telehealth platform connecting patients, providers, pharmacies and labs, so every consultation flows into prescriptions, lab orders and a documented care plan.',
    bullets: [
      'Secure, transcribed video consultations',
      'e-Prescriptions and lab results in one record',
      'Dedicated portals for every role',
    ],
    features: [
      'Patient, provider, pharmacy, lab & admin portals',
      'Multi-tenant client organisations',
      'Provider search & scheduling',
      'Secure audio & video consultations',
      'Consultation transcription',
      'Shared clinical record',
      'e-Prescriptions (DoseSpot)',
      'Lab orders & results',
      'Payments (1Merchant)',
      'Real-time chat (TalkJS & Twilio)',
      'Role-based access control',
      'Usage reporting',
    ],
    image: telehealthShot,
    imageAlt:
      'Illustration of a telehealth console in the provider’s view on a dark stage: appointment, e-prescription, lab order and payment tiles, a secure video consultation being transcribed beside its chat, a prescription sent to the pharmacy and a lab result returned to the record, with a payment received and the patient’s confirmed visit on a phone.',
  },
  {
    slug: 'responsible-ai-governance',
    eyebrow: 'RISK & COMPLIANCE',
    tone: 'standard',
    title: 'Responsible AI Governance',
    summary:
      'A policy-control framework that lets regulated organisations adopt generative AI at scale, enforcing custom policies by zone, region and department on top of HIPAA, SOC 1, SOC 2 and GDPR controls.',
    bullets: [
      'Custom policies by zone, region and department',
      'HIPAA, SOC 1, SOC 2 and GDPR controls',
      'Production-ready RAG on Vertex AI',
    ],
    features: [
      'SOC 1 & SOC 2',
      'HIPAA',
      'GDPR',
      'Custom policy enforcement',
      'Zone, region & department policies',
      'User management',
      'Voice dictation',
      'Multi-model queries',
      'RAG on Vertex AI',
    ],
    image: governanceShot,
    imageAlt:
      'Illustration of an AI governance console on a dark stage: HIPAA, SOC 1, SOC 2 and GDPR controls passing, a custom policy tree from zone to region to departments each enforcing its own policy, a RAG pipeline on Vertex AI gated by the department policy, and an audit trail, with a declined request and a grounded answer.',
  },
  {
    slug: 'intelligent-pallet-verification',
    eyebrow: 'SUPPLY CHAIN',
    tone: 'standard',
    title: 'Intelligent Pallet Verification',
    summary:
      'A computer vision and AI agent system that verifies every pallet against its order at the loading dock, extracts shipping documents automatically and flags discrepancies before dispatch.',
    bullets: [
      'Automated pallet-to-order verification',
      'Intelligent document extraction',
      'Full audit trail for every decision',
    ],
    features: [
      'Pallet-to-order verification',
      'Computer vision',
      'AI agents (Google ADK)',
      'Document data extraction',
      'Discrepancy alerts & reports',
      'Warehouse hardware integration',
      'Audit trail',
      'Vertex AI on Google Cloud',
    ],
    image: palletShot,
    imageAlt:
      'Illustration of a dock verification console on a dark stage: a dock camera detecting the cartons on a pallet, one product line flagged short, the pallet checked line by line against its order, a packing list read from its paperwork, the pallet held on the dock, and the decision logged to the audit trail.',
  },
  {
    slug: 'intelligent-load-planning',
    eyebrow: 'LOGISTICS',
    tone: 'standard',
    title: 'Intelligent Load Planning',
    summary:
      'A web and mobile freight platform where AI agents plan each load, assigning the carrier, vehicle and driver for planner approval, with live tracking, proof of delivery and invoicing end to end.',
    bullets: [
      'AI-assisted carrier, vehicle and driver assignment',
      'Live GPS tracking with ETA and delay alerts',
      'Offline-first mobile app for drivers',
    ],
    features: [
      'Load intake & pricing',
      'AI load planning (Google ADK)',
      'Carrier, vehicle & driver assignment',
      'Planner review & approval',
      'Carrier & driver onboarding',
      'Matching & dispatch',
      'Delivery appointments',
      'Live GPS tracking',
      'ETA, delay, off-route & geofence alerts',
      'Offline-first driver app (iOS & Android)',
      'Proof of delivery',
      'Invoicing',
      'Shipper & carrier portals',
    ],
    image: loadPlanningShot,
    imageAlt:
      'Illustration of a load planning console on a dark stage: a new load from a shipper, planning agents proposing its carrier, vehicle and driver, the route tracked live on a map with its ETA, a plan ready for the planner’s approval, and the load arriving on the driver’s phone.',
  },
];
