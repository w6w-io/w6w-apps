/**
 * Is Braze up? — its Statuspage, read **per instance**.
 *
 * Verified 2026-09-05: `status.braze.com/api/v2/summary.json` is a genuine
 * Statuspage instance (`page.name` is "Braze, Inc.", not a decoy). It groups
 * components by cluster — `US 01 Cluster`, `US 02 Cluster`, … `EU 02 Cluster`,
 * plus several this app's spec never gives a REST hostname for (AU-01, ID-01,
 * JP-01, KR-01) — and each cluster group repeats the same handful of child
 * component names (`REST APIs`, `Dashboard`, `Data Processing`, `Outbound
 * Messaging`, `Currents`, `Cloud Data-Ingestion (CDI)`, `SDK Data Collection`).
 * A component is therefore only identifiable as (cluster group, name), exactly
 * the `apps/jumpcloud` app's region-suffixed-component situation — resolved
 * the same way, through `group_id` rather than name matching alone.
 *
 * This app's actions only ever call the REST API, so only the `REST APIs`
 * child of the CONNECTION's own cluster is watched. A US-02 outage must not
 * mark a US-01 connection down, and `Dashboard`/`Data Processing`/etc. are
 * real Braze services this app's actions never touch.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { type Instance, resolveInstance } from "../lib/client.ts";

const STATUS_HOST = "status.braze.com";

/** Instance code -> the cluster group name the status page uses. */
const CLUSTER_LABEL: Record<Instance, string> = {
  "iad-01": "US 01",
  "iad-02": "US 02",
  "iad-03": "US 03",
  "iad-04": "US 04",
  "iad-05": "US 05",
  "iad-06": "US 06",
  "iad-08": "US 08",
  "fra-01": "EU 01",
  "fra-02": "EU 02",
};

const WATCHED_COMPONENT = "REST APIs";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

interface Component {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Braze platform status",
  description:
    "The REST APIs component for THIS connection's cluster on Braze's status page. Reads the " +
    "Connection for the instance; sends no credential.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const instance = resolveInstance(ctx.connection);
    const clusterLabel = `${CLUSTER_LABEL[instance]} Cluster`;

    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const cluster = body.components.find((c) => c.group === true && c.name === clusterLabel);
    if (!cluster?.id) {
      return { state: "unknown", message: `status page names no "${clusterLabel}" cluster` };
    }

    const rest = body.components.find((c) =>
      c.group !== true && c.group_id === cluster.id && c.name === WATCHED_COMPONENT
    );
    if (!rest) {
      return {
        state: "unknown",
        message: `status page names no "${WATCHED_COMPONENT}" component under ${clusterLabel}`,
      };
    }

    const state = STATES[String(rest.status)] ?? "unknown";
    return {
      state,
      message: state === "ok" ? `${clusterLabel} REST APIs operational` : rest.status,
      components: { [WATCHED_COMPONENT]: { state, message: rest.status } },
      ttlSeconds: 120,
    };
  },
};

export default service;
