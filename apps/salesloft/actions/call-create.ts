import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  personId?: number;
  to?: string;
  duration?: number;
  disposition?: string;
  sentiment?: string;
  notes?: string;
  userGuid?: string;
}

/**
 * POST /v2/activities/calls — log a call against a person. `disposition`
 * and `sentiment` are free strings here because Salesloft's valid values are
 * configured per-team (see the Call Dispositions / Call Sentiments
 * endpoints, not exposed by this app) rather than a fixed global enum.
 * Confirmed against developers.salesloft.com/docs/api/calls-create (listed
 * under the "Calls" category as "Create a call").
 */
const callCreate: ActionDefinition<Input> = {
  key: "call-create",
  type: "perform",
  resource: "call",
  title: "Log Call",
  description: "Log a call for a person.",
  idempotent: false,
  params: [
    {
      key: "personId",
      label: "Person ID",
      type: "number",
      hint: "The person this call is logged for.",
    },
    { key: "to", label: "Phone number called", type: "string" },
    { key: "duration", label: "Duration (seconds)", type: "number" },
    {
      key: "disposition",
      label: "Disposition",
      type: "string",
      hint: "Must match one of this team's configured call dispositions, if the team requires one.",
    },
    {
      key: "sentiment",
      label: "Sentiment",
      type: "string",
      hint: "Must match one of this team's configured call sentiments, if the team requires one.",
    },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "userGuid",
      label: "User GUID",
      type: "string",
      advanced: true,
      hint: "Defaults to the authenticated user. Only team admins may log calls for another user.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Call" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/activities/calls", {
      method: "POST",
      body: compact({
        person_id: input.personId,
        to: input.to,
        duration: input.duration,
        disposition: input.disposition,
        sentiment: input.sentiment,
        notes: input.notes,
        user_guid: input.userGuid,
      }),
    });
  },
};

export default callCreate;
