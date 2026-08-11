import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient, USER_FIELDS } from "../lib/client.ts";

interface Input {
  userId?: string;
  includeGroups?: boolean;
}

/**
 * `id` is optional on this query and omitting it returns the API key's OWNER
 * (docs: `graphql-api/query/user`), which is why the param is not required —
 * with no id this is a whoami that needs no privilege at all.
 *
 * `$userId` is declared `String` (nullable) rather than the `String!` the
 * vendor's usage example shows: their example always passes an id, but the
 * argument itself is optional, and `String!` would make omitting it a client-
 * side validation error.
 */
function buildQuery(includeGroups: boolean): string {
  return `
    query User($userId: String) {
      user(id: $userId) {
        ${USER_FIELDS}
        recent_transcript
        recent_meeting
        ${
    includeGroups
      ? "user_groups { id name handle members { user_id first_name last_name email } }"
      : ""
  }
      }
    }
  `;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one teammate by id, or the API key's own owner when no id is given.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "Leave blank for the API key's owner. `user-list` lists teammates.",
    },
    {
      key: "includeGroups",
      label: "Include user groups",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "user.user_id", type: "string", label: "User ID" },
    { key: "user.name", type: "string", label: "Name" },
    { key: "user.email", type: "string", label: "Email" },
    { key: "user.is_admin", type: "boolean", label: "Is admin" },
    { key: "user.num_transcripts", type: "number", label: "Transcript count" },
    { key: "user.minutes_consumed", type: "number", label: "Minutes consumed" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(buildQuery(input.includeGroups === true), {
      userId: input.userId,
    });
  },
};

export default userGet;
