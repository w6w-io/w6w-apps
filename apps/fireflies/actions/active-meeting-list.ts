import type { ActionDefinition } from "@w6w/types";
import { csv, FirefliesClient } from "../lib/client.ts";

interface Input {
  email?: string;
  states?: string;
}

/**
 * `$states` is declared `[MeetingState!]` — the form the vendor's own usage
 * example uses — rather than the `[MeetingState]` its Arguments table names.
 * The stricter declaration is the safe one either way round: a non-null-item
 * list variable is accepted where a nullable-item list is expected, but not the
 * reverse, so guessing `[MeetingState]` would break if the schema is `!`.
 */
const QUERY = `
  query ActiveMeetings($email: String, $states: [MeetingState!]) {
    active_meetings(input: { email: $email, states: $states }) {
      id
      title
      organizer_email
      meeting_link
      start_time
      end_time
      privacy
      state
    }
  }
`;

const activeMeetingList: ActionDefinition<Input> = {
  key: "active-meeting-list",
  type: "read",
  resource: "live-meeting",
  title: "List Active Meetings",
  description:
    "List meetings the notetaker is currently in. These are the meeting ids the live-meeting actions take.",
  params: [
    {
      key: "email",
      label: "User email",
      type: "string",
      hint:
        "Blank returns your own. Only a team admin may pass someone else's — a regular user gets `forbidden`.",
    },
    {
      key: "states",
      label: "States",
      type: "multiselect",
      options: [
        { value: "active", label: "Active — recording" },
        { value: "paused", label: "Paused — bot present, recording stopped" },
      ],
      hint: "Blank returns both.",
    },
  ],
  output: [
    { key: "active_meetings", type: "array", label: "Active meetings" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(QUERY, {
      email: input.email,
      // A multiselect may arrive as an array already; accept a comma-separated
      // string too so the field can be driven from an expression.
      states: Array.isArray(input.states) ? input.states : csv(input.states),
    });
  },
};

export default activeMeetingList;
