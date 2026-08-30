/**
 * How much room is left on the tenant's default document library — storage
 * headroom, read from the `quota` facet of the tenant root site's own drive.
 *
 * A health check answers a question about the *connection*, not about
 * whichever site a given workflow run happens to address, so it has no site
 * to be told about. `/sites/root` — "the organization's default site", per
 * the SharePoint overview — is the one site every work-or-school connection
 * can resolve without configuration, so its default library is what this
 * check probes. A different site's library may sit on a different quota
 * entirely; this is a connection-level smoke test, not a report on the site a
 * workflow targets.
 *
 * `GET /sites/root/drive` returns a `drive` resource whose `quota` facet is
 * the same documented reading OneDrive's own drive carries — `total`, `used`,
 * `remaining`, `deleted` (recycle bin) and a vendor-computed `state`:
 *
 *     normal   — plenty of remaining quota
 *     nearing  — remaining is less than 10% of total
 *     critical — remaining is less than 1% of total
 *     exceeded — used exceeds total; new files can't be added
 *
 * https://learn.microsoft.com/en-us/graph/api/resources/quota
 *
 * The `state` field is the vendor's own verdict, so this check reads it
 * rather than re-deriving one from the byte counts — the same rule the pack
 * applies to status feeds. The counts are reported alongside as a
 * `HealthQuota` so a UI can show the numbers, and are used only as the
 * fallback when a drive omits `state` (a document library on an unlimited
 * tenant plan may).
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "is
 *     there room for the next write".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the probe stays on the App's own egress
 *     allowlist, so the spec's ban on pairing `network.allow` with a signed
 *     posture never binds.
 *   - `severity: "informational"` — a full library is worth showing and is
 *     not the App being broken. It also keeps an `exceeded` root library from
 *     pinning the roll-up verdict at `down` while every other site's reads
 *     and writes still work perfectly.
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
  title: "Default document library storage headroom",
  description:
    "Bytes left on the tenant root site's default document library, read from the `quota` facet of `GET /sites/root/drive`. A connection-level smoke test, not a report on the site a given workflow addresses. Reports the vendor's own `state` (normal / nearing / critical / exceeded) rather than re-deriving one.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/sites/root/drive`);
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

    return {
      state,
      message: facet.state
        ? `default document library: SharePoint reports storage state \`${facet.state}\``
        : "default document library: no storage state reported; judged from the byte counts",
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
