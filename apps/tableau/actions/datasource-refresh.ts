import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";

/**
 * `POST /sites/{siteId}/datasources/{datasourceId}/refresh` — verified
 * against Tableau's "Update Data Source Now" reference page.
 *
 * Runs a FULL extract refresh regardless of the data source's own schedule
 * type — "always runs a full refresh even if the refresh type is set to
 * incremental" — unless `incremental` is explicitly requested (API 3.28+).
 * Answers 202 with an asynchronous job, not the refreshed data: this starts
 * the refresh, it does not wait for it.
 */
const action: ActionDefinition = {
  key: "datasource-refresh",
  type: "perform",
  resource: "datasource",
  title: "Refresh a data source now",
  description: "Trigger an immediate extract refresh, without waiting for its schedule.",
  idempotent: false,
  params: [
    { key: "datasourceId", label: "Data Source ID", type: "string", required: true },
    {
      key: "incremental",
      label: "Incremental",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Requires API 3.28+ (Tableau Cloud 2025.3 / Server 2025.3). Ignored on older servers.",
    },
  ],
  output: [
    { key: "jobId", type: "string", label: "Job ID" },
    { key: "mode", type: "string", label: "Mode" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const datasourceId = String(p.datasourceId ?? "").trim();
    if (!datasourceId) throw new Error("`datasourceId` is required");

    ctx.log("info", "starting a Tableau data source refresh", { datasourceId });

    const body = await new TableauClient(ctx).request<
      { job: { id: string; mode?: string; type?: string } }
    >(`/datasources/${encodeURIComponent(datasourceId)}/refresh`, {
      method: "POST",
      body: p.incremental === true ? { extractRefresh: { incremental: "true" } } : {},
    });
    return { jobId: body.job.id, mode: body.job.mode };
  },
};

export default action;
