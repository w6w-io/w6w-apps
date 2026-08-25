import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  weekly?: unknown;
  overrides?: unknown;
}

/**
 * PATCH /users/{id}/scheduling-availability — replaces the schedule for any
 * day/date provided (each entry fully overwrites that day/date, it does not
 * merge). `weekly[].working_hours` and `overrides[].working_hours` are deeply
 * nested (day/date -> time ranges -> location objects), so both are taken as
 * raw JSON matching the vendor's own shape rather than flattened into
 * dozens of params:
 *
 *   weekly:    [{ day, working_hours: [{ start_time, end_time, locations: [{ type, id?, value? }] }] }]
 *   overrides: [{ date, working_hours: [...] }]   // working_hours: [] blocks the whole date;
 *                                                  // working_hours: null DELETES an existing override
 *
 * Times are `HH:MM`, must be multiples of 15 minutes. Location `type` is one
 * of `in_person_by_host`, `in_person_by_guest`, `online_dynamic_link`,
 * `online_static_link`, `phone_by_guest` — note this is a DIFFERENT
 * vocabulary from the `location.type` used by time-slots/schedule/reassign.
 */
const userSchedulingAvailabilityUpdate: ActionDefinition<Input> = {
  key: "user-scheduling-availability-update",
  type: "perform",
  resource: "user",
  title: "Update Scheduling Availability",
  description:
    "Replace a user's weekly hours and/or date overrides (PATCH /users/{id}/scheduling-availability).",
  idempotent: true,
  output: [
    { key: "timezone", type: "string", label: "Timezone" },
    { key: "weekly", type: "array", label: "Weekly hours" },
    { key: "overrides", type: "array", label: "Date overrides" },
  ],
  params: [
    { key: "id", label: "User ID", type: "string", required: true },
    {
      key: "weekly",
      label: "Weekly hours",
      type: "json",
      hint:
        '[{ "day": "Monday", "working_hours": [{ "start_time": "09:00", "end_time": "12:00", "locations": [{ "type": "online_dynamic_link" }] }] }]',
    },
    {
      key: "overrides",
      label: "Date overrides",
      type: "json",
      advanced: true,
      hint:
        '[{ "date": "2026-12-25", "working_hours": [] }] to block a date, or "working_hours": null to delete an existing override.',
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(
      `/users/${encodeURIComponent(input.id)}/scheduling-availability`,
      { method: "PATCH", body: { weekly: input.weekly, overrides: input.overrides } },
    );
  },
};

export default userSchedulingAvailabilityUpdate;
