/**
 * Is MeisterTask up?
 *
 * ## The status page is real, checked three ways on 2026-09-05
 *
 * MeisterTask publishes at **`status.meistertask.com`**, built on the
 * **Sorry** status-page platform (`sorryapp.com` — visible in the page's own
 * `<meta name="generator" content="Sorry™ (https://www.sorryapp.com)" />`),
 * not Atlassian Statuspage or Instatus like most vendors in this pack.
 *
 * **(a) Bogus sibling path — is this a catch-all?** Yes for the human page,
 * no for the JSON API:
 *
 *   | Path                  | Status | Bytes  | Content-Type              |
 *   | ---------------------- | ------ | ------ | -------------------------- |
 *   | `/` (the HTML page)   | 200    | 94,141 | `text/html`                 |
 *   | `/api/v1/status`      | 200    | 345    | `application/json`          |
 *   | `/api/status`         | 404    | 35,450 | `text/html` (the SPA shell) |
 *   | `/status.json`        | 404    | 35,442 | `text/html` (the SPA shell) |
 *
 * The Statuspage/Instatus-shaped paths every other check in this pack tries
 * first (`/api/v2/summary.json` etc.) all 404 as the same SPA shell — this
 * vendor's real JSON API lives at the Sorry-specific `/api/v1/*` paths
 * instead, which is easy to miss if you stop at the first 404.
 *
 * **(b) Content-type and body.** `application/json`, parsing as
 * `{"page": {"id", "name", "state", "state_text", ...}}`.
 *
 * **(c) Does the page describe THIS product?** Yes:
 * `"page": {"id": 2543, "name": "MeisterTask", "url": "https://status.meistertask.com"}`,
 * and `/api/v1/components` names a genuine `API` component (id 1791) among
 * four (`Web Application`, `API`, `Support`, `Email Insertion to section`).
 *
 * ## Sorry's state vocabulary is not publicly documented
 *
 * Unlike Atlassian Statuspage (`operational` / `degraded_performance` /
 * `partial_outage` / `major_outage`), Sorry does not publish a state enum
 * anywhere this app could find. Every component observed live on
 * 2026-09-05 read `"operational"`, so that is the only value mapped with
 * confidence; anything else is reported `degraded` rather than guessed at
 * `down` — an unrecognised state says "something changed", not "how badly".
 *
 * ## Why the API component specifically
 *
 * `Web Application` covers the browser app this API-only integration never
 * touches; `API` is the one component that actually predicts whether this
 * app's calls succeed, so it is reported both standalone and folded into the
 * overall verdict — a page-level "all systems go" while `API` itself is
 * degraded would otherwise read as healthy.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. MeisterTask is
 * SaaS-only, so an incident here really is evidence about every Connection.
 * `credential: "none"` is explicit for the same reason as every other
 * `service` check in this pack: a status host must never see a token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.meistertask.com/api/v1/status";
export const COMPONENTS_URL = "https://status.meistertask.com/api/v1/components";

/** The one component id this app's own calls actually depend on. */
export const API_COMPONENT_ID = 1791;

interface SorryPage {
  id?: number;
  name?: string;
  state?: string;
  state_text?: string;
  url?: string;
}

interface SorryStatusBody {
  page?: SorryPage;
}

interface SorryComponent {
  id?: number;
  name?: string;
  state?: string;
}

interface SorryComponentsBody {
  components?: SorryComponent[];
}

/**
 * The only value observed live is `"operational"`. Everything else maps to
 * `degraded` rather than `down` — see the module comment on why Sorry's
 * vocabulary is treated conservatively.
 */
export function mapSorryState(state: string | undefined): HealthState {
  if (state === "operational") return "ok";
  if (!state) return "unknown";
  return "degraded";
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "MeisterTask platform status",
  description: "Page-level status plus the API component, read from status.meistertask.com " +
    "(a Sorry-hosted status page, not Statuspage/Instatus).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.meistertask.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about MeisterTask — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as SorryStatusBody | null;
    const page = body?.page;
    if (!page) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    if (page.url && !/(^|\/\/|\.)status\.meistertask\.com(\/|$)/i.test(page.url)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as MeisterTask's",
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    let apiState: HealthState | undefined;

    const compRes = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
    if (compRes.ok) {
      const compBody = await compRes.json().catch(() => null) as SorryComponentsBody | null;
      for (const c of compBody?.components ?? []) {
        if (!c?.id || !c.name) continue;
        const state = mapSorryState(c.state);
        components[String(c.id)] = state === "ok"
          ? { state, message: c.name }
          : { state, message: `${c.name}: ${c.state}` };
        if (c.id === API_COMPONENT_ID) apiState = state;
      }
    }

    const pageState = mapSorryState(page.state);
    // The page-level indicator and the API component can disagree (a healthy
    // page while `API` itself lags); report the worse of the two rather than
    // trusting the page-level roll-up alone.
    const state = apiState !== undefined ? worstHealthState([pageState, apiState]) : pageState;

    const notes: string[] = [];
    if (page.state_text) notes.push(page.state_text);
    if (apiState !== undefined && apiState !== "ok") notes.push(`API component: ${apiState}`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
