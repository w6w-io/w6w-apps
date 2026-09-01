import type { ActionDefinition } from "@w6w/types";
import { PhantomBusterClient } from "../lib/client.ts";
import { stripOrgSecrets } from "../lib/params.ts";

/**
 * `GET /orgs/fetch` — the current organization's profile and billing record.
 *
 * This action never sets `withProxies`, `withCrmIntegrations` or
 * `withGlobalObject` — three vendor opt-in flags that would add, respectively,
 * proxy-pool passwords, HubSpot/Salesforce/Pipedrive OAuth **refresh
 * tokens**, and an opaque org-wide scratch blob a script may have stashed
 * anything in. Never asking for them is simpler and safer than fetching then
 * stripping.
 *
 * What IS stripped, because the vendor returns it **unconditionally** (no
 * opt-in gate covers it): `identityTokens` (magic-link login tokens for this
 * org) and, when present, `qualificationFlow.sessionCookie` (a session cookie
 * pasted during onboarding). See `lib/client.ts` and `lib/params.ts#stripOrgSecrets`.
 */
type Input = Record<string, never>;

const orgGet: ActionDefinition<Input> = {
  key: "org-get",
  type: "read",
  title: "Get Organization",
  description: "Get the current organization's profile and billing record.",
  params: [],
  output: [{ key: "org", type: "object", label: "Organization" }],

  async execute(_input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const org = await client.get("/orgs/fetch");
    return { org: stripOrgSecrets(org) };
  },
};

export default orgGet;
