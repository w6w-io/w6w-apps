import type { ActionDefinition } from "@w6w/types";
import { type BookingsEnvelope, unwrapReturnValue, ZohoBookingsClient } from "../lib/client.ts";
import { workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId?: string;
}

interface Workspace {
  id: string;
  name: string;
}

interface Output {
  data: Workspace[];
}

/**
 * `GET /bookings/v1/json/workspaces` — the one Bookings endpoint that takes
 * no required parameter at all. `auth/oauth2.ts` uses it both as the `test`
 * probe and to record a default `workspaceId` on the connection at connect
 * time; this action exists for the multi-workspace case, or simply to
 * confirm an id before calling `service-list` (which requires one).
 */
const workspaceList: ActionDefinition<Input, Output> = {
  key: "workspace-list",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description: "List every workspace on this account, or fetch a single one by id.",
  params: [{ ...workspaceId, hint: "Optional — fetch only this workspace." }],
  output: [{ key: "data", type: "array", label: "Workspaces" }],

  async execute(input, ctx) {
    const body = await new ZohoBookingsClient(ctx).request<BookingsEnvelope<{ data: Workspace[] }>>(
      "/workspaces",
      { query: { workspace_id: input.workspaceId } },
    );
    return unwrapReturnValue(body, "GET", "/bookings/v1/json/workspaces");
  },
};

export default workspaceList;
