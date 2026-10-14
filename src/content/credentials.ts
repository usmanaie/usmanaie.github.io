import certificationImage from '../assets/credentials/professional-cloud-developer.png';

/**
 * Google Cloud credentials, from the owner's public Google Skills profile. Badge images are
 * Google's own artwork (src/assets/credentials/badges/<id>.png, resized); every badge links to
 * its public page on the profile so visitors can verify it.
 */
const PROFILE = 'https://www.skills.google/public_profiles/4a128489-ec43-4c60-af5a-13ac83f6b549';

const images = import.meta.glob<{ default: ImageMetadata }>('../assets/credentials/badges/*.png', { eager: true });
function badgeImage(id: string): ImageMetadata {
  const image = images[`../assets/credentials/badges/${id}.png`]?.default;
  if (!image) throw new Error(`Missing badge image ${id}`);
  return image;
}

export interface Badge {
  id: string;
  title: string;
  /** 'YYYY-MM-DD' */
  earned: string;
  image: ImageMetadata;
  url: string;
  /** Skill badges carry a level; completion badges do not. */
  level?: 'Advanced' | 'Intermediate' | 'Introductory';
  /** Google retired the course; kept for the record, not shown. */
  deprecated?: boolean;
}

type BadgeInput = [id: string, title: string, earned: string, extra?: Partial<Pick<Badge, 'level' | 'deprecated'>>];
const badge = ([id, title, earned, extra]: BadgeInput): Badge => ({
  id,
  title,
  earned,
  image: badgeImage(id),
  url: `${PROFILE}/badges/${id}`,
  ...extra,
});

export const credentials = {
  heading: { lead: 'My Google Cloud', accent: 'Profile' },
  intro:
    'A professional certification backed by hands-on skill badges and courses in agents, RAG and Gemini on Google Cloud.',
  profile: { url: PROFILE, platform: 'Google Skills', league: 'Gold League', points: 39878, memberSince: 2024 },
  certification: {
    title: 'Professional Cloud Developer',
    issuer: 'Google Cloud Certified',
    level: 'Professional',
    /** OWNER-CONFIRM: validity (matches Education). */
    validity: 'Valid 2026–2028',
    image: certificationImage,
  },
  /** Newest first. */
  skillBadges: (
    [
      ['23796874', 'Deploy Kubernetes Applications on Google Cloud', '2026-04-25', { level: 'Introductory' }],
      ['17558276', 'Evaluate Gen AI model and agent performance', '2025-08-15', { level: 'Advanced' }],
      ['17549603', 'Deploy a RAG application with vector search in Firestore', '2025-08-15', { level: 'Advanced' }],
      ['17532794', 'Edit images with Imagen', '2025-08-14', { level: 'Advanced' }],
      ['17530695', 'Deploy and Evaluate Model Garden Models', '2025-08-14', { level: 'Advanced' }],
      ['17473797', 'Extend Gemini with controlled generation and Tool use', '2025-08-12', { level: 'Advanced' }],
      ['9781221', 'Text Prompt Engineering Techniques', '2024-07-09', { level: 'Intermediate' }],
    ] satisfies BadgeInput[]
  ).map(badge),
  /** Newest first. */
  completionBadges: (
    [
      ['25244584', 'Gen AI: Beyond the Chatbot', '2026-06-30'],
      ['24353831', 'Streamline App Development with Gemini Code Assist', '2026-05-22'],
      ['24352910', 'Developing Applications with Cloud Run Functions on Google Cloud', '2026-05-22'],
      ['23916618', 'Service Orchestration and Choreography on Google Cloud', '2026-05-01'],
      ['23860239', 'Accelerate App Development with Gemini CLI', '2026-04-28'],
      ['23859585', 'Developing Applications with Google Cloud: Foundations', '2026-04-28'],
      ['23808125', 'Developing Containerized Applications on Google Cloud', '2026-04-26'],
      ['23756976', 'Integrate Applications with Gemini on Google Cloud', '2026-04-23'],
      ['23756192', 'Developing Applications with Cloud Run on Google Cloud: Fundamentals', '2026-04-23'],
      ['22484020', 'Build intelligent agents with Agent Development Kit (ADK)', '2026-02-22'],
      ['17556697', 'Machine Learning Operations (MLOps) with Agent Platform: Model Evaluation', '2025-08-15'],
      ['17556953', 'Evaluate ADK Agents with Vertex AI Gen AI Evaluation Service', '2025-08-15', { deprecated: true }],
      ['17556372', 'Model evaluation on Vertex AI', '2025-08-15', { deprecated: true }],
      ['17547783', 'Implement Hybrid Search', '2025-08-15'],
      ['17547473', 'Implement RAG with Agent Platform', '2025-08-15'],
      ['17544849', 'Create Embeddings, Vector Search, and RAG with BigQuery', '2025-08-15'],
      ['17532031', 'Understand and Respond to Media', '2025-08-14'],
      ['17531370', 'Generate and Edit Media in Agent Platform', '2025-08-14'],
      ['17500860', 'Improve Performance by Fine-Tuning Foundation Models', '2025-08-13', { deprecated: true }],
      ['17496305', 'Find, Explore and Deploy Model Garden Models', '2025-08-13'],
      ['17473392', 'Empower Gen AI Apps with Tool Use', '2025-08-12'],
      ['17469188', 'Engineer Effective Prompts for Generative Models', '2025-08-12'],
      ['17468205', "Explore Google's Gen AI Models", '2025-08-12'],
      ['8972491', 'Essential Google Cloud Infrastructure: Foundation', '2024-05-11'],
      ['8872532', 'Build a Certification Study Guide: PCA Exam Prep', '2024-05-04'],
      ['8636819', 'App Deployment, Debugging, and Performance', '2024-04-13'],
      ['8631374', 'Getting Started With Application Development', '2024-04-12'],
      ['8620308', 'Google Cloud Fundamentals: Core Infrastructure', '2024-04-11'],
    ] satisfies BadgeInput[]
  ).map(badge),
};

/** What the site shows: everything except retired courses. */
export const shownSkillBadges = credentials.skillBadges.filter((b) => !b.deprecated);
export const shownCompletionBadges = credentials.completionBadges.filter((b) => !b.deprecated);
