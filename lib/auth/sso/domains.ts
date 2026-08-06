const DOMAIN_SPLIT_RE = /[, \n]+/;
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function parseEmailDomains(input: string | readonly string[]): string[] {
  const parts: string[] = [];
  if (typeof input === "string") {
    for (const part of input.split(DOMAIN_SPLIT_RE)) {
      parts.push(part);
    }
  } else {
    for (const part of input) {
      parts.push(part);
    }
  }
  const normalized = new Set<string>();
  for (const part of parts) {
    const domain = part.trim().toLowerCase();
    if (domain) {
      normalized.add(domain);
    }
  }
  return Array.from(normalized);
}

export function assertValidEmailDomains(domains: readonly string[]): void {
  if (domains.length === 0) {
    throw new Error("At least one email domain is required.");
  }
  for (const domain of domains) {
    if (!DOMAIN_RE.test(domain)) {
      throw new Error(`Invalid email domain: ${domain}`);
    }
  }
}

export function domainsFromStored(value: string): string[] {
  return parseEmailDomains(value);
}

export function domainMatches(emailDomain: string, storedDomains: string): boolean {
  const needle = emailDomain.trim().toLowerCase();
  return domainsFromStored(storedDomains).includes(needle);
}
