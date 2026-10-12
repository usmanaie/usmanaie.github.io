export interface EducationItem {
  title: [string, string];
  body: string;
  featured: boolean;
}

export const education: {
  heading: { lead: string; accent: string };
  intro: string;
  items: EducationItem[];
} = {
  heading: { lead: 'My', accent: 'Education' },
  intro:
    'The academic foundation and Google Cloud credentials behind how I design, build and ship intelligent systems.',
  /** OWNER-CONFIRM: grades and certification validity dates. */
  items: [
    {
      title: ['B.S. in Computer', 'Science'],
      body: 'International Islamic University Islamabad, 2018–2022. Final grade: A.',
      featured: false,
    },
    {
      title: ['Professional Cloud', 'Developer'],
      body: 'Google Cloud certification, valid 2026–2028, alongside ADK, RAG and Vertex AI credentials.',
      featured: true,
    },
    {
      title: ['F.Sc. Pre-', 'Engineering'],
      body: 'F.G. Science Degree College for Men, Islamabad, 2016–2018. Final grade: A.',
      featured: false,
    },
  ],
};
