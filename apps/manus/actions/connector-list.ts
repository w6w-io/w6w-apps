import type { ActionDefinition } from "@w6w/types";
import { type ConnectorInfo, type ConnectorListResponse, ManusClient } from "../lib/client.ts";

/**
 * `GET /v2/connector.list` — connectors installed in the account (builtin,
 * bring-your-own-key, or MCP). Use the returned ids in `task-create`'s
 * Connectors param.
 */
const connectorList: ActionDefinition<Record<string, never>, ConnectorInfo[]> = {
  key: "connector-list",
  type: "read",
  resource: "connector",
  title: "List Connectors",
  description: "List connectors installed in the account.",
  params: [],
  output: [{ key: "", type: "array", label: "Connectors" }],

  async execute(_input, ctx) {
    const res = await new ManusClient(ctx).request<ConnectorListResponse>("/v2/connector.list");
    return res.data;
  },
};

export default connectorList;
