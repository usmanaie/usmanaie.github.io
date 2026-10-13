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
    { from: 'guardrails', to: 'agent', label: 'approved', text: 'The guardrails approve the answer.' },
    { from: 'agent', to: 'user', label: 'response', text: 'The agent delivers the response to the user.' },
  ],
} as const;

export type FlowNodeId = (typeof hero.nodes)[number]['id'];

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
