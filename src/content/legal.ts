/**
 * Draft Privacy Policy and Terms for a static, cookie-free, mailto-only portfolio.
 * OWNER-CONFIRM: Usman must review and sign off this copy before launch. It is a
 * sensible starting point, not legal advice (see LAUNCH_CHECKLIST.md).
 */
export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalPage {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const privacy: LegalPage = {
  title: 'Privacy Policy',
  description:
    'How this portfolio handles personal data: no cookies, no analytics, and email only when you choose to write.',
  lastUpdated: '2026-10-12',
  sections: [
    {
      heading: 'Who is responsible',
      paragraphs: [
        'This website is the personal portfolio of Usman Aslam, who is responsible for the processing described here. You can reach him at the email address linked on this site.',
      ],
    },
    {
      heading: 'What this site does not do',
      paragraphs: [
        'This site sets no cookies, runs no analytics or advertising, and loads nothing from third-party servers: all fonts, images and scripts are served from this domain. There are no forms, accounts or tracking pixels.',
      ],
    },
    {
      heading: 'Hosting and server logs',
      paragraphs: [
        'The site is served by Google Firebase Hosting. To deliver pages and keep the service secure, the hosting provider automatically processes technical data such as your IP address, browser user agent, the page requested and the time of the request. This data is used only to operate and protect the service and is retained according to the provider’s own policies.',
      ],
    },
    {
      heading: 'When you send an email',
      paragraphs: [
        'If you choose to contact Usman by email, your message, your email address and anything you include are used only to reply to you and to continue the conversation you started. They are not shared with third parties or used for marketing, and are deleted when they are no longer needed for that purpose.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'Depending on where you live, data protection laws such as the GDPR may give you the right to access, correct or delete personal data held about you, to object to or restrict its processing, and to lodge a complaint with a supervisory authority. To exercise any of these rights, send an email using the contact link on this site.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'If the way this site handles data changes, for example if privacy-friendly analytics are added, this page will be updated first and the date below will change.',
      ],
    },
  ],
};

export const terms: LegalPage = {
  title: 'Terms & Conditions',
  description: 'The terms that apply when you use this portfolio website.',
  lastUpdated: '2026-10-12',
  sections: [
    {
      heading: 'About this site',
      paragraphs: [
        'This website presents the professional background and work of Usman Aslam. By using it, you agree to these terms. If you do not agree, please do not use the site.',
      ],
    },
    {
      heading: 'Content and intellectual property',
      paragraphs: [
        'Unless stated otherwise, the text, design, illustrations and code of this site belong to Usman Aslam or are used with permission. You may share links to the site and quote short passages with attribution. Any other reproduction requires prior written permission.',
        'Product and company names mentioned on this site are trademarks of their respective owners and are used only to describe work and experience.',
      ],
    },
    {
      heading: 'Project descriptions',
      paragraphs: [
        'Project summaries describe work in general terms and may omit or change details to protect clients’ confidential information. Illustrations are representative, not screenshots of client systems.',
      ],
    },
    {
      heading: 'No warranty',
      paragraphs: [
        'The site is provided as is, for general information only. Nothing on it is professional advice, and no guarantee is given that it is complete, current or available without interruption. To the extent permitted by law, no liability is accepted for loss arising from its use.',
      ],
    },
    {
      heading: 'External links',
      paragraphs: [
        'Links to other websites are provided for convenience. Those sites are not controlled by Usman Aslam, who is not responsible for their content or privacy practices.',
      ],
    },
    {
      heading: 'Changes',
      paragraphs: [
        'These terms may be updated from time to time. The current version always applies, and the date below shows when it last changed.',
      ],
    },
  ],
};
