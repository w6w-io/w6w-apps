import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";

/**
 * `GET /sites/{siteId}/datasources/{datasourceId}` — verified against
 * Tableau's "Query Data Source" reference page. Requires Connect permission
 * on the data source (implicit or explicit) for a non-admin PAT.
 */
const action: ActionDefinition = {
  key: "datasource-get",
  type: "read",
  resource: "datasource",
  title: "Get a data source",
  description: "Read a published data source's metadata.",
  params: [
    { key: "datasourceId", label: "Data Source ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Data Source ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "isCertified", type: "boolean", label: "Certified" },
    { key: "hasExtracts", type: "boolean", label: "Has extracts" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const datasourceId = String(p.datasourceId ?? "").trim();
    if (!datasourceId) throw new Error("`datasourceId` is required");

    const body = await new TableauClient(ctx).request<{ datasource: Record<string, unknown> }>(
      `/datasources/${encodeURIComponent(datasourceId)}`,
    );
    return body.datasource;
  },
};

export default action;
