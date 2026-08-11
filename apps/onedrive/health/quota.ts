/**
 * How much room is left on THIS drive — storage headroom, read from the drive's
 * own `quota` facet.
 *
 * `GET /me/drive` returns a `drive` resource whose `quota` facet is a documented,
 * first-class reading — `total`, `used`, `remaining`, `deleted` (recycle bin) and
 * a vendor-computed `state`:
 *
 *     normal   — plenty of remaining quota
 *     nearing  — remaining is less than 10% of total
 *     critical — remaining is less than 1% of total
 *     exceeded — used exceeds total; new files can't be added
 *
 * https://learn.microsoft.com/en-us/graph/api/resources/quota
 *
 * The `state` field is the vendor's own verdict, so this check reads it rather
 * than re-deriving one from the byte counts — the same rule the pack applies to
 * status feeds. The counts are reported alongside as a `HealthQuota` so a UI can
 * show the numbers, and are used only as the fallback when a drive omits `state`
 * (SharePoint document libraries under an unlimited tenant plan do).
 *
 * Probe choice: `GET /me/drive` is the cheapest Files call there is (1 resource
 * unit — a single-item query), needs no item to point at, and returns the quota
 * facet in the same response. Deliberately a drive call rather than an item
 * call, because a health check must not need to be told which file to poke.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     upload succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the drive behind the
 *     credential, and reading it needs the credential on the wire. Signing is
 *     safe because the probe stays on the App's own egress allowlist — this
 *     check declares no `network.allow` of its own, which the spec forbids
 *     alongside a signed posture.
 *   - `severity: "informational"` — a full drive is worth showing and is not the
 *     App being broken. It also keeps an `exceeded` drive from pinning the
 *     roll-up verdict at `down` while every read action still works perfectly.
 *
 * API *rate* headroom is a separate question with a separate answer: see
 * `request-rate.ts`, which declares it absent and says why.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

interface DriveQuota {
  total?: number;
  used?: number;
  remaining?: number;
  deleted?: number;
  state?: string;
}

/** The vendor's own enumeration, mapped onto health states. */
const STATE_BY_QUOTA: Record<string, HealthState> = {
  normal: "ok",
  nearing: "degraded",
  critical: "degraded",
  exceeded: "down",
};

/** Fallback for a drive that reports byte counts but no `state`. */
function stateFromBytes(quota: DriveQuota): HealthState {
  const { total, remaining } = quota;
  if (typeof remaining !== "number") return "unknown";
  if (remaining <= 0) return "down";
  if (typeof total === "number" && total > 0 && remaining / total < 0.1) return "degraded";
  return "ok";
}

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Drive storage headroom",
  description:
    "Bytes left on the drive behind this connection, read from the `quota` facet of `GET /me/drive`. Reports the vendor's own `state` (normal / nearing / critical / exceeded) rather than re-deriving one.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me/drive`);
    if (!res.ok) {
      // 429 is the one failure that still answers a question worth answering.
      if (res.status === 429) {
        const retry = res.headers.get("retry-after");
        return {
          state: "down",
          message: retry
            ? `throttled by SharePoint Online (429); retry after ${retry}s`
            : "throttled by SharePoint Online (429)",
          ttlSeconds: 60,
        };
      }
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }

    const drive = await res.json().catch(() => null) as
      | { driveType?: string; quota?: DriveQuota }
      | null;
    const facet = drive?.quota;
    if (!facet) {
      return {
        state: "unknown",
        message: "the drive resource carried no `quota` facet",
        ttlSeconds: 300,
      };
    }

    const vendorState = facet.state ? STATE_BY_QUOTA[facet.state] : undefined;
    const state = vendorState ?? stateFromBytes(facet);
    const kind = drive?.driveType ? `${drive.driveType} drive` : "drive";

    return {
      state,
      message: facet.state
        ? `${kind}: OneDrive reports storage state \`${facet.state}\``
        : `${kind}: no storage state reported; judged from the byte counts`,
      quota: [{
        id: "storage",
        limit: num(facet.total),
        remaining: num(facet.remaining),
        unit: "bytes",
      }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
