export interface ExpertiseItem {
  title: string;
  body: string;
}

export const expertise: {
  heading: { lead: string; accent: string };
  intro: string;
  cta: string;
  items: ExpertiseItem[];
} = {
  heading: { lead: 'Areas of', accent: 'Expertise' },
  intro: 'Where I spend my days: AI agents, the cloud they run on, and the experiences and engineering around them.',
  cta: 'GET STARTED',
  /** Owner's four areas (Oct 2026): AI (agentic + generative, merged), Cloud, User Experience, Engineering. */
  items: [
    {
      title: 'AI',
      body: 'Multi-agent systems, RAG pipelines and LLM orchestration on Vertex AI, governed for HIPAA, SOC 2 and GDPR.',
    },
    {
      title: 'CLOUD',
      body: 'Secure, scalable Google Cloud foundations across infrastructure, storage, networking, security and IAM.',
    },
    {
      title: 'USER EXPERIENCE',
      body: 'Intuitive, accessible interfaces that turn complex AI workflows into clear, effortless experiences.',
    },
    {
      title: 'ENGINEERING',
      body: 'End-to-end solution design: modular architectures, scalable APIs and robust backends in Java and Python.',
    },
  ],
};
