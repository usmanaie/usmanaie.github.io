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
  intro:
    'Where I spend my days: designing agents, grounding them in real data, and shipping them safely on Google Cloud.',
  cta: 'GET STARTED',
  items: [
    {
      title: 'AGENTIC AI',
      body: 'Autonomous multi-agent systems with Google ADK, MCP and Agent2Agent (A2A), built on the ReAct pattern.',
    },
    {
      title: 'GEN AI & RAG',
      body: 'LLM orchestration, retrieval-augmented generation on Vertex AI, prompt engineering and tool use.',
    },
    {
      title: 'CLOUD & BACKEND',
      body: 'Scalable APIs, ETL and multi-tenant services on Google Cloud with Java, Python and Spring Boot.',
    },
    {
      title: 'AI GOVERNANCE',
      body: 'HIPAA, SOC 2 and GDPR-aligned policy controls that let regulated teams adopt AI responsibly.',
    },
  ],
};
