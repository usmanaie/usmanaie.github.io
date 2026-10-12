import { site } from '../content/site';

/** schema.org Person + WebSite for the home page. jobTitle always mirrors site.jobTitle. */
export function homeStructuredData(origin: URL | undefined): object[] {
  const url = new URL('/', origin).href;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${url}#person`,
      name: site.name,
      jobTitle: site.jobTitle,
      description: site.description,
      url,
      image: new URL('/og.jpg', origin).href,
      sameAs: site.sameAs,
      knowsAbout: site.knowsAbout,
      hasCredential: {
        '@type': 'EducationalOccupationalCredential',
        name: 'Google Cloud Professional Cloud Developer',
        credentialCategory: 'certification',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${url}#website`,
      name: site.name,
      url,
      inLanguage: site.locale,
      author: { '@id': `${url}#person` },
    },
  ];
}
