/**
 * How much of this organization's PhantomBuster plan is left?
 *
 * ## One call, both the reading and the ceiling
 *
 * `GET /orgs/fetch-resources` ("Gets the current organization's resources and
 * usage") returns, at its top level, one number per metered dimension
 * (`dailyExecutionTime`, `dailyMail`, `dailyCaptcha`, `dailyDiscoveredMail`,
 * `dailyAiCredit`, `dailySerpCredits`, and the `monthly*` equivalents, plus
 * `s3Storage`), and *also* a nested `plan` object carrying the SAME
 * dimensions under their plural vendor names (`plan.dailyMails`,
 * `plan.dailyCaptchas`, …) — the ceiling for each. No second call is needed.
 *
 * ## What direction the top-level numbers read — a documented assumption
 *
 * Neither the OpenAPI document nor the prose guides give these fields a
 * description; only the names are known. This check reads the top-level
 * numbers as **remaining headroom** against `plan.*` as the ceiling, on three
 * grounds: (1) the endpoint's own description says "resources" (what is left
 * to spend), not "usage"; (2) the response carries dedicated
 * `dailyResourceNextResetAt` / `monthlyResourceNextResetAt` timestamps, the
 * shape a countdown-to-reset value takes, not a running usage counter; (3) the
 * identically-named fields on `GET /orgs/fetch` (`org-get`'s `dailyMail`
 * etc.) are clearly an ALLOWANCE — an org record has no reason to carry a live
 * usage counter as a core identity field — so the same names recurring here
 * read most naturally as the same allowance concept, now expressed as what
 * remains of it. This could not be confirmed against a live account (no
 * credential was available while building this app); if a user's dashboard
 * shows the opposite direction, that is a real gap in this reading, not a
 * silent one — flag it against this comment.
 *
 * ## Same endpoint as the credential probe, on purpose
 *
 * `auth/api-key.ts` probes this exact endpoint. That is deliberate rather
 * than duplication, mirroring this pack's Apify app: it is the one endpoint
 * that needs a credential, returns no credential material, and is the only
 * source of headroom — so `minIntervalSeconds` keeps the cost to one call a
 * minute either way.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const RESOURCES_URL = `${API_BASE}${API_PREFIX}/orgs/fetch-resources`;

/** Remaining-fraction at or below this threshold is worth flagging. */
export const WARN_FRACTION_REMAINING = 0.1;

interface ResourcesBody {
  dailyExecutionTime?: number;
  dailyMail?: number;
  dailyCaptcha?: number;
  dailyDiscoveredMail?: number;
  dailyAiCredit?: number;
  dailySerpCredits?: number;
  monthlyExecutionTime?: number;
  monthlyMail?: number;
  monthlyCaptcha?: number;
  monthlyDiscoveredMail?: number;
  monthlyAiCredit?: number;
  monthlySerpCredits?: number;
  s3Storage?: number;
  dailyResourceNextResetAt?: number;
  monthlyResourceNextResetAt?: number;
  plan?: {
    dailyExecutionTime?: number;
    dailyMails?: number;
    dailyCaptchas?: number;
    dailyDiscoveredMails?: number;
    dailyAiCredits?: number;
    dailySerpCredits?: number;
    monthlyExecutionTime?: number;
    monthlyMails?: number;
    monthlyCaptchas?: number;
    monthlyDiscoveredMails?: number;
    monthlyAiCredits?: number;
    monthlySerpCredits?: number;
    s3Storage?: number;
  };
}

/** `remaining` key -> `limit` key on `plan`, plus unit and reset-timestamp field. */
export const QUOTA_DIMENSIONS: Array<{
  id: string;
  remainingKey: keyof ResourcesBody;
  planKey: keyof NonNullable<ResourcesBody["plan"]>;
  unit: string;
  resetKey?: "dailyResourceNextResetAt" | "monthlyResourceNextResetAt";
}> = [
  {
    id: "daily-execution-time",
    remainingKey: "dailyExecutionTime",
    planKey: "dailyExecutionTime",
    unit: "seconds",
    resetKey: "dailyResourceNextResetAt",
  },
  {
    id: "daily-mail",
    remainingKey: "dailyMail",
    planKey: "dailyMails",
    unit: "credits",
    resetKey: "dailyResourceNextResetAt",
  },
  {
    id: "daily-captcha",
    remainingKey: "dailyCaptcha",
    planKey: "dailyCaptchas",
    unit: "credits",
    resetKey: "dailyResourceNextResetAt",
  },
  {
    id: "daily-discovered-mail",
    remainingKey: "dailyDiscoveredMail",
    planKey: "dailyDiscoveredMails",
    unit: "credits",
    resetKey: "dailyResourceNextResetAt",
  },
  {
    id: "daily-ai-credit",
    remainingKey: "dailyAiCredit",
    planKey: "dailyAiCredits",
    unit: "credits",
    resetKey: "dailyResourceNextResetAt",
  },
  {
    id: "daily-serp-credits",
    remainingKey: "dailySerpCredits",
    planKey: "dailySerpCredits",
    unit: "credits",
    resetKey: "dailyResourceNextResetAt",
  },
  {
    id: "monthly-execution-time",
    remainingKey: "monthlyExecutionTime",
    planKey: "monthlyExecutionTime",
    unit: "seconds",
    resetKey: "monthlyResourceNextResetAt",
  },
  {
    id: "monthly-mail",
    remainingKey: "monthlyMail",
    planKey: "monthlyMails",
    unit: "credits",
    resetKey: "monthlyResourceNextResetAt",
  },
  {
    id: "monthly-captcha",
    remainingKey: "monthlyCaptcha",
    planKey: "monthlyCaptchas",
    unit: "credits",
    resetKey: "monthlyResourceNextResetAt",
  },
  {
    id: "monthly-discovered-mail",
    remainingKey: "monthlyDiscoveredMail",
    planKey: "monthlyDiscoveredMails",
    unit: "credits",
    resetKey: "monthlyResourceNextResetAt",
  },
  {
    id: "monthly-ai-credit",
    remainingKey: "monthlyAiCredit",
    planKey: "monthlyAiCredits",
    unit: "credits",
    resetKey: "monthlyResourceNextResetAt",
  },
  {
    id: "monthly-serp-credits",
    remainingKey: "monthlySerpCredits",
    planKey: "monthlySerpCredits",
    unit: "credits",
    resetKey: "monthlyResourceNextResetAt",
  },
  { id: "s3-storage", remainingKey: "s3Storage", planKey: "s3Storage", unit: "bytes" },
];

/** Worst-first, matching `HEALTH_STATE_RANK` in `@w6w/types`. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

export interface DimensionReading {
  quota: HealthQuota;
  state: HealthState;
  note?: string;
}

/** Turn one dimension into a quota reading plus the state it implies. Exported for testing. */
export function readDimension(
  dimension: typeof QUOTA_DIMENSIONS[number],
  body: ResourcesBody,
): DimensionReading | undefined {
  const remaining = body[dimension.remainingKey];
  const limit = body.plan?.[dimension.planKey];
  if (typeof remaining !== "number" || typeof limit !== "number") return undefined;

  const resetAtSeconds = dimension.resetKey ? body[dimension.resetKey] : undefined;
  const quota: HealthQuota = {
    id: dimension.id,
    limit,
    remaining: Math.max(0, remaining),
    unit: dimension.unit,
    ...(typeof resetAtSeconds === "number"
      ? { resetAt: new Date(resetAtSeconds).toISOString() }
      : {}),
  };

  // A non-positive ceiling reads as "not part of this plan" rather than "none left".
  if (limit <= 0) return { quota, state: "ok" };

  const fraction = remaining / limit;
  if (fraction <= 0) {
    return {
      quota,
      state: "down",
      note: `${dimension.id}: 0/${limit} ${dimension.unit} remaining`,
    };
  }
  if (fraction <= WARN_FRACTION_REMAINING) {
    return {
      quota,
      state: "degraded",
      note: `${dimension.id}: ${remaining}/${limit} ${dimension.unit} remaining (${
        Math.round(fraction * 100)
      }%)`,
    };
  }
  return { quota, state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Organization resource headroom",
  description:
    "Daily and monthly execution time, mail/captcha/discovered-mail/AI/SERP credits, and S3 " +
    "storage, read from GET /orgs/fetch-resources.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(RESOURCES_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return {
        state: "unknown",
        message: `PhantomBuster returned ${res.status} for /orgs/fetch-resources`,
      };
    }

    const body = await res.json().catch(() => null) as ResourcesBody | null;
    if (!body) return { state: "unknown", message: "Account resources response was unreadable" };

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    for (const dimension of QUOTA_DIMENSIONS) {
      const reading = readDimension(dimension, body);
      if (!reading) continue;
      quotas.push(reading.quota);
      if (reading.note) notes.push(reading.note);
      if (RANK[reading.state] > RANK[state]) state = reading.state;
    }

    if (quotas.length === 0) {
      return {
        state: "unknown",
        message: "Account resources response carried no known dimensions",
      };
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
