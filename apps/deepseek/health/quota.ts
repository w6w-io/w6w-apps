/**
 * How much balance is left on THIS credential — DeepSeek.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will
 *     the next call be refused for insufficient balance". DeepSeek's own
 *     error-code documentation names this a distinct failure mode: HTTP
 *     `402` means "Insufficient Balance", separate from `401` (bad key) or
 *     `429` (rate limited) — see quick_start/error_codes.
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct here: the balance belongs to the
 *     account behind the credential, and reading it needs the credential on
 *     the wire. Signing is safe because the probe stays on the app's own
 *     egress allowlist — this check declares no `network.allow` of its own,
 *     which the spec forbids alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /user/balance`. Verified against
 * https://api-docs.deepseek.com/api/get-user-balance/ (2026-09-05) that the
 * response carries no credential material — only `is_available` and a
 * `balance_infos` array of `{ currency, total_balance, granted_balance,
 * topped_up_balance }` — so signing this probe leaks nothing beyond what the
 * `get-balance` action already exposes as a read result.
 *
 * The API states liveness directly via `is_available` rather than exposing a
 * spending cap this check could turn into a percentage, so — unlike a
 * rate-limit-headroom check — this reports only `ok` / `down` / `unknown`
 * rather than inventing a `degraded` threshold the vendor never documented.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

interface BalanceInfo {
  currency?: string;
  total_balance?: string;
  granted_balance?: string;
  topped_up_balance?: string;
}

const num = (v: string | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Account balance",
  description:
    "The account's current balance by currency, and whether DeepSeek itself reports it as " +
    "sufficient for API calls.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/user/balance`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach DeepSeek: ${String(err)}` };
    }

    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `balance probe returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { is_available?: boolean; balance_infos?: BalanceInfo[] }
      | null;
    const infos = body?.balance_infos ?? [];
    if (infos.length === 0) {
      return { state: "unknown", message: "response carried no balance_infos" };
    }

    const quotas: HealthQuota[] = infos.map((b, i) => ({
      id: b.currency ?? `balance-${i}`,
      remaining: num(b.total_balance),
      unit: b.currency ?? "credit",
    }));
    const summary = quotas.map((q) => `${(q.remaining ?? 0).toFixed(2)} ${q.unit}`).join(", ");

    if (body?.is_available === false) {
      return {
        state: "down",
        message: `DeepSeek reports the balance is insufficient for API calls (${summary})`,
        quota: quotas,
      };
    }

    return { state: "ok", message: summary, quota: quotas, ttlSeconds: 300 };
  },
};

export default quota;
