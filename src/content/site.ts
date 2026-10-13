/**
 * Site-wide identity and copy. Items marked OWNER-CONFIRM are listed in
 * LAUNCH_CHECKLIST.md and must be verified by Usman before launch.
 */

/** Career start; drives every "years of experience" figure on the site. */
export const CAREER_START = new Date('2022-05-01T00:00:00Z');

/** Build-time date, so derived figures and the copyright year are never hard-coded. */
export const BUILD_DATE = new Date();

export function yearsSince(start: Date, now: Date = BUILD_DATE): number {
  let years = now.getUTCFullYear() - start.getUTCFullYear();
  const beforeAnniversary =
    now.getUTCMonth() < start.getUTCMonth() ||
    (now.getUTCMonth() === start.getUTCMonth() && now.getUTCDate() < start.getUTCDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export function numberToWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

export const yearsOfExperience = yearsSince(CAREER_START);

export const site = {
  name: 'Usman Aslam',
  /** OWNER-CONFIRM: final job title (the design used both "Lead AI Engineer" and "Lead Software Engineer"). */
  jobTitle: 'Lead Software Engineer',
  /** Email is stored in parts and only assembled (percent-encoded) at build time. */
  email: { user: 'usmanaslam1002', domain: 'gmail.com' },
  tagline:
    'Lead Software Engineer building agentic AI, RAG pipelines and governed, production-grade systems on Google Cloud.',
  description:
    'Usman Aslam is a Lead Software Engineer and Google Cloud certified Professional Cloud Developer building agentic AI, RAG pipelines and governed, production-grade systems on Google Cloud.',
  locale: 'en',
  themeColor: '#05060B',
  /** OWNER-CONFIRM: add LinkedIn and any other profiles. */
  sameAs: ['https://github.com/usmanaie'],
  knowsAbout: [
    'Agentic AI',
    'Multi-agent systems',
    'Google Agent Development Kit (ADK)',
    'Model Context Protocol (MCP)',
    'Agent2Agent (A2A) protocol',
    'Retrieval-augmented generation',
    'Vertex AI',
    'Google Cloud',
    'AI governance',
    'HIPAA',
    'SOC 2',
    'GDPR',
    'Java',
    'Python',
    'Spring Boot',
  ],
} as const;

export const hero = {
  titleLines: [
    [
      { text: 'From', dim: false },
      { text: 'idea', dim: true },
    ],
    [
      { text: 'to', dim: false },
      { text: 'impact', dim: true },
    ],
  ],
  /** Desktop line breaks follow the design; on small screens the text wraps naturally. */
  subheading: {
    line1: 'Building products at the',
    line2: 'intersection of AI,',
    accentRed: 'creativity,',
    line3: 'and',
    accentBlue: 'technology.',
  },
  body: ['I turn bold ideas into intelligent, intuitive', 'experiences that drive real-world impact.'],
  cta: 'Let’s build something',
  navCta: 'Let’s talk',
  replayLabel: 'Replay the agent flow',
  flowLabel: 'How an AI agent handles a request',
  /**
   * End-to-end agent loop, in order. The agent itself (step 2) is the robot; every other
   * step is a bubble. The loop closes when the response returns to the user.
   */
  flow: [
    { id: 'user', label: 'USER', caption: 'request · intent', tone: 'blue' },
    { id: 'agent', label: 'AGENT', caption: 'plan · orchestrate', tone: 'blue' },
    { id: 'llm', label: 'LLM', caption: 'reason · decide', tone: 'red' },
    { id: 'rag', label: 'RAG', caption: 'retrieve · ground', tone: 'red' },
    { id: 'tools', label: 'TOOLS', caption: 'call · execute', tone: 'blue' },
    { id: 'guardrails', label: 'GUARDRAILS', caption: 'verify · comply', tone: 'red' },
    { id: 'response', label: 'RESPONSE', caption: 'answer · deliver', tone: 'blue' },
  ],
} as const;

export type FlowStepId = (typeof hero.flow)[number]['id'];

/** Shown under the hero CTA. The badge image is Google's official artwork, unmodified. */
export const certification = {
  issuer: 'Google Cloud Certified',
  name: 'Professional Cloud Developer',
  /** OWNER-CONFIRM: public verification link (Credly/Accredible). When set, the chip becomes a link. */
  credentialUrl: undefined as string | undefined,
};

export const about = {
  heading: { lead: 'From Complex Requirements to', accent: 'Production-Grade AI' },
  paragraphs: [
    'I’m a Lead Software Engineer who designs scalable, enterprise-grade backend systems and intelligent AI solutions that create real business value.',
    'My work spans telehealth, supply chain and AI governance, and today I specialise in agentic AI on Google Cloud. Across every role, I’ve been drawn to the same challenge:',
  ],
  emphasis: 'Turning ambitious ideas into reliable software.',
  /** OWNER-CONFIRM: "HIPAA, SOC 2 and GDPR controls in production". */
  closing:
    'I enjoy leading system design, mentoring engineers, and shipping AI that is safe, compliant and responsible, with HIPAA, SOC 2 and GDPR controls in production.',
  scrollLabel: 'Scroll down to Education',
} as const;

export const contact = {
  heading: { lead: 'Let’s Build Something', accent: 'Meaningful Together' },
  body: 'Whether you’re exploring agentic AI, need a RAG pipeline grounded in your own data, or want AI adopted safely under HIPAA, SOC 2 or GDPR, I’d love to hear about it.',
  ringLabel: 'Contact Usman by email',
  backdrop: ['WHENEVER YOU ARE', 'READY'],
} as const;
