import { site } from '../content/site';

/**
 * Builds the contact mailto: href with every character percent-encoded.
 *
 * Browsers decode it transparently (it works with JavaScript disabled), while the
 * address never appears as plain text in the HTML, which defeats the naive
 * regex-based harvesters that scrape "name@domain" patterns.
 */
export function mailtoHref(user: string = site.email.user, domain: string = site.email.domain): string {
  const address = `${user}@${domain}`;
  const encoded = Array.from(
    new TextEncoder().encode(address),
    (byte) => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`,
  ).join('');
  return `mailto:${encoded}`;
}
