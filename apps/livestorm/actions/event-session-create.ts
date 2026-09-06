import type { ActionDefinition } from "@w6w/types";
import { buildBody, compact, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

/**
 * `POST /events/{id}/sessions` — create a session under an event. Optionally attaches people
 * (e.g. panelists/team members) via the `relationships.people` array the vendor documents.
 */
interface Input {
  id: string;
  name?: string;
  estimatedStartedAt?: string;
  timezone?: string;
  peopleIds?: string[];
  peopleRole?: string;
}

const eventSessionCreate: ActionDefinition<Input> = {
  key: "event-session-create",
  type: "perform",
  resource: "event",
  title: "Create Event Session",
  description: "Create a new session under an event, optionally attaching people to it.",
  idempotent: false,
  params: [
    { key: "id", label: "Event ID", type: "string", required: true },
    { key: "name", label: "Session name", type: "string" },
    {
      key: "estimatedStartedAt",
      label: "Estimated start",
      type: "string",
      hint: 'e.g. "2020-11-28 10:30:00".',
    },
    { key: "timezone", label: "Timezone", type: "string", hint: 'e.g. "America/New_York".' },
    {
      key: "peopleIds",
      label: "Attach people (People IDs)",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "peopleRole",
      label: "Attached people role",
      type: "select",
      options: [
        { label: "Team member", value: "team_member" },
        { label: "Participant", value: "participant" },
      ],
      hint: 'Applied to every ID in "Attach people".',
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const attributes = compact({
      name: input.name,
      estimated_started_at: input.estimatedStartedAt,
      timezone: input.timezone,
    });
    const relationships = input.peopleIds?.length
      ? {
        people: input.peopleIds.map((id) => ({
          data: { type: "people", id, role: input.peopleRole ?? "team_member" },
        })),
      }
      : undefined;
    const body = buildBody("sessions", attributes, relationships);
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>(
      `/events/${encodeURIComponent(input.id)}/sessions`,
      { method: "POST", body },
    );
    return res.data;
  },
};

export default eventSessionCreate;
