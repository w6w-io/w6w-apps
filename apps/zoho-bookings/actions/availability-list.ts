import type { ActionDefinition } from "@w6w/types";
import {
  type BookingsEnvelope,
  compact,
  unwrapReturnValue,
  ZohoBookingsClient,
} from "../lib/client.ts";
import { serviceIdRequired, staffId } from "../lib/params.ts";

interface Input {
  serviceId: string;
  staffId?: string;
  groupId?: string;
  resourceId?: string;
  selectedDate: string;
}

interface Output {
  data: string[];
  timeZone?: string;
}

/**
 * `GET /bookings/v1/json/availableslots`. The vendor doc lists
 * `staff_id`/`group_id`/`resource_id` as one combined requirement — "any one
 * of the above id is mandatory" — which no single `required` param can
 * express, so `execute` enforces it itself rather than letting Zoho answer
 * an ambiguous 400.
 */
const availabilityList: ActionDefinition<Input, Output> = {
  key: "availability-list",
  type: "read",
  resource: "availability",
  title: "List Available Slots",
  description:
    "Fetch open appointment slots for a service on a given date. Exactly one of Staff ID / " +
    "Group ID / Resource ID is required alongside Service ID and Selected Date.",
  params: [
    serviceIdRequired,
    { ...staffId, hint: "The staff member to check. Provide this, Group ID, or Resource ID." },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "For a collective-booking service.",
    },
    {
      key: "resourceId",
      label: "Resource ID",
      type: "string",
      hint: "For a resource-booking service.",
    },
    {
      key: "selectedDate",
      label: "Selected date",
      type: "string",
      required: true,
      hint: "Format: dd-MMM-yyyy HH:mm:ss, e.g. 30-Apr-2030 10:00:00.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Available slot start times" },
    { key: "timeZone", type: "string", label: "Time zone the slots are expressed in" },
  ],

  async execute(input, ctx) {
    if (!input.staffId && !input.groupId && !input.resourceId) {
      throw new Error("Provide one of `staffId`, `groupId` or `resourceId`.");
    }
    const body = await new ZohoBookingsClient(ctx).request<
      BookingsEnvelope<{ data: string[]; time_zone?: string }>
    >(
      "/availableslots",
      {
        query: compact({
          service_id: input.serviceId,
          staff_id: input.staffId ?? "",
          group_id: input.groupId ?? "",
          resource_id: input.resourceId ?? "",
          selected_date: input.selectedDate,
        }),
      },
    );
    const rv = unwrapReturnValue(body, "GET", "/bookings/v1/json/availableslots");
    return { data: rv.data, timeZone: rv.time_zone };
  },
};

export default availabilityList;
