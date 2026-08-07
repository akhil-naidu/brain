"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SsoProvider = {
  readonly providerId: string;
  readonly issuer: string;
  readonly domains: readonly string[];
  readonly protocol: "oidc" | "saml";
  readonly oidcCallbackUrl: string;
  readonly samlCallbackUrl: string;
  readonly clientId: string | null;
  readonly hasClientSecret: boolean;
  readonly domainVerified: boolean;
};

type DnsInstruction = {
  readonly providerId: string;
  readonly token: string;
  readonly hosts: readonly { readonly domain: string; readonly host: string }[];
};

function parseDnsHosts(value: unknown): { domain: string; host: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const hosts: { domain: string; host: string }[] = [];
  for (const entry of value) {
    const item: unknown = entry;
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const domain: unknown = Reflect.get(item, "domain");
    const host: unknown = Reflect.get(item, "host");
    if (typeof domain === "string" && typeof host === "string") {
      hosts.push({ domain, host });
    }
  }
  return hosts;
}

function isSsoProvider(value: unknown): value is SsoProvider {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("providerId" in value) || typeof value.providerId !== "string") {
    return false;
  }
  if (!("issuer" in value) || typeof value.issuer !== "string") {
    return false;
  }
  if (!("protocol" in value) || (value.protocol !== "oidc" && value.protocol !== "saml")) {
    return false;
  }
  if (!("domains" in value) || !Array.isArray(value.domains)) {
    return false;
  }
  if (!value.domains.every((domain) => typeof domain === "string")) {
    return false;
  }
  if (!("oidcCallbackUrl" in value) || typeof value.oidcCallbackUrl !== "string") {
    return false;
  }
  if (!("samlCallbackUrl" in value) || typeof value.samlCallbackUrl !== "string") {
    return false;
  }
  if (!("domainVerified" in value) || typeof value.domainVerified !== "boolean") {
    return false;
  }
  return true;
}

export function WorkspaceSsoSection(props: {
  readonly enabled: boolean;
  readonly canManage: boolean;
}) {
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [ssoLicensed, setSsoLicensed] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"idle" | "oidc" | "saml">("idle");

  const [providerId, setProviderId] = useState("");
  const [issuer, setIssuer] = useState("");
  const [domains, setDomains] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [cert, setCert] = useState("");
  const [dnsInstruction, setDnsInstruction] = useState<DnsInstruction | null>(null);

  const load = useCallback(async () => {
    if (!props.enabled) {
      return;
    }
    try {
      const response = await fetch("/api/workspaces/sso");
      const data: unknown = await response.json();
      if (!response.ok || typeof data !== "object" || data === null) {
        setError("Unable to load SSO providers.");
        return;
      }
      setSsoLicensed("ssoLicensed" in data && Boolean(data.ssoLicensed));
      setCanManage("canManage" in data && Boolean(data.canManage));
      if ("providers" in data && Array.isArray(data.providers)) {
        setProviders(data.providers.filter(isSsoProvider));
      }
      setError(null);
    } catch {
      setError("Unable to load SSO providers.");
    }
  }, [props.enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!props.enabled) {
    return null;
  }

  async function saveOidc() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/sso", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          protocol: "oidc",
          providerId,
          issuer,
          domains,
          clientId,
          clientSecret: clientSecret || undefined,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to save OIDC provider.",
        );
        setPending(false);
        return;
      }
      setMode("idle");
      setClientSecret("");
      await load();
      setPending(false);
    } catch {
      setPending(false);
      setError("Unable to save OIDC provider.");
    }
  }

  async function saveSaml() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/sso", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          protocol: "saml",
          providerId,
          issuer,
          domains,
          entryPoint,
          cert: cert || undefined,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to save SAML provider.",
        );
        setPending(false);
        return;
      }
      setMode("idle");
      setCert("");
      await load();
      setPending(false);
    } catch {
      setPending(false);
      setError("Unable to save SAML provider.");
    }
  }

  async function requestDomain(id: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/sso/domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId: id, action: "request" }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to request domain verification.",
        );
        setPending(false);
        return;
      }
      if (typeof data === "object" && data !== null) {
        const tokenValue: unknown = Reflect.get(data, "domainVerificationToken");
        const domainsValue: unknown = Reflect.get(data, "domains");
        if (typeof tokenValue === "string") {
          setDnsInstruction({
            providerId: id,
            token: tokenValue,
            hosts: parseDnsHosts(domainsValue),
          });
        }
      }
      setPending(false);
    } catch {
      setPending(false);
      setError("Unable to request domain verification.");
    }
  }

  async function verifyDomain(id: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/sso/domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId: id, action: "verify" }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to verify domain.",
        );
        setPending(false);
        return;
      }
      setDnsInstruction(null);
      await load();
      setPending(false);
    } catch {
      setPending(false);
      setError("Unable to verify domain.");
    }
  }

  async function removeProvider(id: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/workspaces/sso", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId: id }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to delete provider.",
        );
        setPending(false);
        return;
      }
      await load();
      setPending(false);
    } catch {
      setPending(false);
      setError("Unable to delete provider.");
    }
  }

  return (
    <div className="border-border/80 bg-card/40 space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Single sign-on</p>
        <p className="text-muted-foreground text-xs">
          {ssoLicensed
            ? "Configure an OIDC or SAML IdP for this workspace. Sign-in routes by email domain."
            : "SSO is locked by the host license."}
        </p>
      </div>

      {!ssoLicensed ? null : providers.length === 0 ? (
        <p className="text-muted-foreground text-xs">No SSO providers configured yet.</p>
      ) : (
        <ul className="space-y-3">
          {providers.map((provider) => (
            <li
              className="border-border space-y-1 rounded-lg border p-3 text-xs"
              key={provider.providerId}
            >
              <p className="text-foreground text-sm font-medium">
                {provider.providerId}{" "}
                <span className="text-muted-foreground font-normal">({provider.protocol})</span>
              </p>
              <p className="text-muted-foreground">Domains: {provider.domains.join(", ")}</p>
              <p className="text-muted-foreground break-all">Issuer: {provider.issuer}</p>
              <p className="text-muted-foreground break-all">
                Callback:{" "}
                {provider.protocol === "oidc" ? provider.oidcCallbackUrl : provider.samlCallbackUrl}
              </p>
              <p className="text-muted-foreground">
                Domain: {provider.domainVerified ? "Verified" : "Unverified (SSO login blocked)"}
              </p>
              {canManage && props.canManage ? (
                <div className="flex flex-wrap gap-2">
                  {!provider.domainVerified ? (
                    <>
                      <Button
                        disabled={pending}
                        onClick={() => {
                          void requestDomain(provider.providerId);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Show DNS token
                      </Button>
                      <Button
                        disabled={pending}
                        onClick={() => {
                          void verifyDomain(provider.providerId);
                        }}
                        size="sm"
                        type="button"
                      >
                        Verify DNS
                      </Button>
                    </>
                  ) : null}
                  <Button
                    disabled={pending}
                    onClick={() => {
                      void removeProvider(provider.providerId);
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
              {dnsInstruction?.providerId === provider.providerId ? (
                <div className="bg-muted/40 mt-2 space-y-1 rounded-md p-2">
                  <p className="text-foreground text-xs font-medium">Publish TXT records</p>
                  <p className="text-muted-foreground break-all">
                    Value: <code>{dnsInstruction.token}</code>
                  </p>
                  {dnsInstruction.hosts.map((item) => (
                    <p className="text-muted-foreground break-all" key={item.host}>
                      Host for {item.domain}: <code>{item.host}</code>
                    </p>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {ssoLicensed && canManage && props.canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() => {
              setMode("oidc");
              setProviderId("");
              setIssuer("");
              setDomains("");
              setClientId("");
              setClientSecret("");
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Add OIDC
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              setMode("saml");
              setProviderId("");
              setIssuer("");
              setDomains("");
              setEntryPoint("");
              setCert("");
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Add SAML
          </Button>
        </div>
      ) : null}

      {mode === "oidc" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sso-oidc-provider-id">
              Provider ID
            </label>
            <Input
              id="sso-oidc-provider-id"
              onChange={(e) => setProviderId(e.target.value)}
              placeholder="okta-prod"
              value={providerId}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sso-oidc-issuer">
              Issuer URL
            </label>
            <Input
              id="sso-oidc-issuer"
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="https://login.example.com"
              value={issuer}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sso-oidc-domains">
              Email domains
            </label>
            <Input
              id="sso-oidc-domains"
              onChange={(e) => setDomains(e.target.value)}
              placeholder="acme.com, acme.co"
              value={domains}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sso-oidc-client-id">
              Client ID
            </label>
            <Input
              id="sso-oidc-client-id"
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Client ID"
              value={clientId}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sso-oidc-client-secret">
              Client secret
            </label>
            <Input
              id="sso-oidc-client-secret"
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Client secret"
              type="password"
              value={clientSecret}
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                void saveOidc();
              }}
              size="sm"
              type="button"
            >
              Save OIDC
            </Button>
            <Button
              disabled={pending}
              onClick={() => setMode("idle")}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "saml" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sso-saml-provider-id">
              Provider ID
            </label>
            <Input
              id="sso-saml-provider-id"
              onChange={(e) => setProviderId(e.target.value)}
              placeholder="okta-saml"
              value={providerId}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sso-saml-issuer">
              Metadata / issuer URL
            </label>
            <Input
              id="sso-saml-issuer"
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="https://idp.example.com/metadata"
              value={issuer}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sso-saml-domains">
              Email domains
            </label>
            <Input
              id="sso-saml-domains"
              onChange={(e) => setDomains(e.target.value)}
              placeholder="acme.com"
              value={domains}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sso-saml-entry-point">
              Entry point URL
            </label>
            <Input
              id="sso-saml-entry-point"
              onChange={(e) => setEntryPoint(e.target.value)}
              placeholder="SAML entry point URL"
              value={entryPoint}
            />
          </div>
          <Field>
            <FieldLabel htmlFor="sso-saml-cert">IdP certificate</FieldLabel>
            <Textarea
              id="sso-saml-cert"
              onChange={(e) => setCert(e.target.value)}
              placeholder="IdP X.509 certificate"
              value={cert}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                void saveSaml();
              }}
              size="sm"
              type="button"
            >
              Save SAML
            </Button>
            <Button
              disabled={pending}
              onClick={() => setMode("idle")}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
