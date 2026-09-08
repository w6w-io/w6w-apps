import type { ActionDefinition } from "@w6w/types";
import { FolkClient, networkPath } from "../lib/client.ts";

/**
 * `GET /network/{networkId}/check-access` — confirms the connected key can
 * reach this network. Also used as the auth `test` probe
 * (`auth/api-key.ts`); exposed here too so a workflow can check access to a
 * DIFFERENT network id than the one on the Connection (e.g. one entered by a
 * user at runtime) without needing a second Connection.
 */
const checkNetworkAccess: ActionDefinition<Record<string, never>> = {
  key: "check-network-access",
  type: "read",
  resource: "network",
  title: "Check Network Access",
  description: "Check that the connected API key can access this network.",
  params: [],
  output: [{ key: "ok", type: "boolean", label: "Accessible" }],

  execute(_input, ctx) {
    return new FolkClient(ctx).request<{ ok: boolean }>(networkPath("/check-access"));
  },
};

export default checkNetworkAccess;
