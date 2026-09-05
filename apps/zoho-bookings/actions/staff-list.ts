import type { ActionDefinition } from "@w6w/types";
import {
  type BookingsEnvelope,
  compact,
  unwrapReturnValue,
  ZohoBookingsClient,
} from "../lib/client.ts";
import { staffId, workspaceId } from "../lib/params.ts";

interface Input {
  staffId?: string;
  serviceId?: string;
  staffEmail?: string;
  workspaceId?: string;
}

interface Output {
  data: Array<Record<string, unknown>>;
}

/**
 * `GET /bookings/v1/json/staffs`. Every parameter is optional and narrows the
 * result — there is no required id, unlike `service-list`.
 */
const staffList: ActionDefinition<Input, Output> = {
  key: "staff-list",
  type: "read",
  resource: "staff",
  title: "List Staff",
  description: "List staff, optionally narrowed by id, assigned service, email or workspace.",
  params: [
    { ...staffId, hint: "Fetch only this staff member." },
    {
      key: "serviceId",
      label: "Service ID",
      type: "string",
      hint: "Only staff assigned to this service.",
    },
    {
      key: "staffEmail",
      label: "Staff email",
      type: "string",
      hint: 'Matched with "contains" logic, not an exact match — a substring is enough.',
    },
    { ...workspaceId, hint: "Only staff assigned to this workspace." },
  ],
  output: [{ key: "data", type: "array", label: "Staff" }],

  async execute(input, ctx) {
    const body = await new ZohoBookingsClient(ctx).request<
      BookingsEnvelope<{ data: Array<Record<string, unknown>> }>
    >(
      "/staffs",
      {
        query: compact({
          staff_id: input.staffId ?? "",
          service_id: input.serviceId ?? "",
          staff_email: input.staffEmail ?? "",
          workspace_id: input.workspaceId ?? "",
        }),
      },
    );
    return unwrapReturnValue(body, "GET", "/bookings/v1/json/staffs");
  },
};

export default staffList;
