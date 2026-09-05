import type { ActionDefinition } from "@w6w/types";
import {
  type BookingsEnvelope,
  compact,
  unwrapReturnValue,
  workspaceIdFrom,
  ZohoBookingsClient,
} from "../lib/client.ts";
import { staffId, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId?: string;
  serviceId?: string;
  staffId?: string;
}

interface Output {
  data: Array<Record<string, unknown>>;
}

/**
 * `GET /bookings/v1/json/services` — `workspace_id` is the one documented
 * required parameter (a 400 without it), so this action falls back to the
 * workspace `afterConnect` recorded on the connection when omitted (see
 * `lib/client.ts#workspaceIdFrom`).
 */
const serviceList: ActionDefinition<Input, Output> = {
  key: "service-list",
  type: "read",
  resource: "service",
  title: "List Services",
  description: "List services under a workspace, or narrow to one service/staff pairing.",
  params: [
    { ...workspaceId, required: false },
    { key: "serviceId", label: "Service ID", type: "string", hint: "Fetch only this service." },
    { ...staffId, hint: "Only services this staff member is assigned to." },
  ],
  output: [{ key: "data", type: "array", label: "Services" }],

  async execute(input, ctx) {
    const body = await new ZohoBookingsClient(ctx).request<
      BookingsEnvelope<{ data: Array<Record<string, unknown>> }>
    >(
      "/services",
      {
        query: compact({
          workspace_id: workspaceIdFrom(input, ctx),
          service_id: input.serviceId ?? "",
          staff_id: input.staffId ?? "",
        }),
      },
    );
    return unwrapReturnValue(body, "GET", "/bookings/v1/json/services");
  },
};

export default serviceList;
