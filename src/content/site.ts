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

/** Current job title (owner-confirmed). Drives <title>, the tagline, the About intro and JSON-LD. */
const JOB_TITLE = 'Lead AI Engineer';

export const site = {
  name: 'Usman Aslam',
  jobTitle: JOB_TITLE,
  /** Email is stored in parts and only assembled (percent-encoded) at build time. */
  email: { user: 'usmanaslam1002', domain: 'gmail.com' },
  tagline: `${JOB_TITLE} building agentic AI, RAG pipelines and governed, production-grade systems on Google Cloud.`,
  description: `Usman Aslam is a ${JOB_TITLE} and Google Cloud certified Professional Cloud Developer building agentic AI, RAG pipelines and governed, production-grade systems on Google Cloud.`,
  locale: 'en',
  themeColor: '#05060B',
  /** OWNER-CONFIRM: add LinkedIn and any other profiles. */
  sameAs: [
    'https://github.com/usmanaie',
    'https://www.skills.google/public_profiles/4a128489-ec43-4c60-af5a-13ac83f6b549',
  ],
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
  /** OWNER-CONFIRM: "Trusted by innovators worldwide". Shown beside the certification badge. */
  trust: ['Trusted by innovators', 'worldwide'],
  /**
   * Participants, numbered by first involvement. The agent (the robot) is the hub: it is the
   * only participant that talks to the others. The LLM never calls tools or retrieval itself;
   * it returns a tool-call request and the agent executes it (the standard tool-calling loop).
   */
  nodes: [
    { id: 'user', label: 'USER', tone: 'blue' },
    { id: 'agent', label: 'AGENT', tone: 'blue' },
    { id: 'llm', label: 'LLM', tone: 'red' },
    { id: 'rag', label: 'RAG', tone: 'red' },
    { id: 'tools', label: 'TOOLS', tone: 'blue' },
    { id: 'guardrails', label: 'GUARDRAILS', tone: 'red' },
  ],
  /**
   * One request, end to end. `label` rides on the travelling token; `text` is the full step
   * for screen readers (rendered as an ordered list).
   */
  hops: [
    { from: 'user', to: 'agent', label: 'request', text: 'The user sends a request to the agent.' },
    {
      from: 'agent',
      to: 'llm',
      label: 'prompt + tools',
      text: 'The agent sends the prompt, history, context and the available tools to the LLM.',
    },
    {
      from: 'llm',
      to: 'agent',
      label: 'tool call: retrieve',
      text: 'The LLM asks the agent to run the retrieval tool.',
    },
    { from: 'agent', to: 'rag', label: 'retrieve', text: 'The agent queries the knowledge base (RAG).' },
    { from: 'rag', to: 'agent', label: 'context', text: 'Retrieval returns grounding context to the agent.' },
    { from: 'agent', to: 'llm', label: 'context', text: 'The agent sends the retrieved context back to the LLM.' },
    { from: 'llm', to: 'agent', label: 'tool call: act', text: 'The LLM asks the agent to run an action tool.' },
    {
      from: 'agent',
      to: 'tools',
      label: 'execute',
      text: 'The agent executes the tool (with approval if it changes anything).',
    },
    { from: 'tools', to: 'agent', label: 'result', text: 'The tool returns its result to the agent.' },
    { from: 'agent', to: 'llm', label: 'result', text: 'The agent sends the tool result to the LLM.' },
    { from: 'llm', to: 'agent', label: 'answer', text: 'The LLM returns the final answer to the agent.' },
    {
      from: 'agent',
      to: 'guardrails',
      label: 'policy check',
      text: 'The agent checks the answer against guardrail policies.',
    },
    {
      from: 'guardrails',
      to: 'agent',
      label: 'approved',
      text: 'The guardrails approve the answer.',
      approves: true,
    },
    { from: 'agent', to: 'user', label: 'response', text: 'The agent delivers the response to the user.' },
  ],
} as const;

export type FlowNodeId = (typeof hero.nodes)[number]['id'];

/** Shown under the hero CTA in the same ring style as the trust claim, with a vector seal (no Google artwork). */
export const certification = {
  issuer: 'Google Cloud Certified',
  name: 'Professional Cloud Developer',
  /** OWNER-CONFIRM: public verification link (Credly/Accredible). When set, the badge becomes a link. */
  credentialUrl: undefined as string | undefined,
};

export const about = {
  heading: { lead: 'From Complex Requirements to', accent: 'Production-Grade AI' },
  /** From the owner's LinkedIn About (Oct 2026). */
  paragraphs: [
    `I’m a ${JOB_TITLE} who designs scalable, enterprise-grade backend systems and intelligent AI solutions that create real business value.`,
    'I’ve shipped a telehealth platform, a generative AI governance platform aligned to HIPAA, SOC 2 and GDPR, and AI-powered supply chain tools that turn documents into decisions. Across every role, I’ve been drawn to the same challenge:',
  ],
  emphasis: 'Building systems that think, act and scale autonomously.',
  closing:
    'I enjoy leading system design, mentoring engineers, and shipping AI that is safe, compliant and responsible, from LLM orchestration and RAG pipelines to multi-agent workflows, with HIPAA, SOC 2 and GDPR controls in production.',
  scrollLabel: 'Scroll down to Expertise',
} as const;

export const contact = {
  heading: { lead: 'Let’s Build Something', accent: 'Meaningful Together' },
  body: 'Whether you’re exploring agentic AI, need a RAG pipeline grounded in your own data, or want AI adopted safely under HIPAA, SOC 2 or GDPR, I’d love to hear about it.',
  ringLabel: 'Contact Usman by email',
  backdrop: ['WHENEVER YOU ARE', 'READY'],
} as const;
