import type { ActionDefinition } from "@w6w/types";
import { PatreonClient } from "../lib/client.ts";

interface Input {
  /** CSV, e.g. "memberships,campaign". */
  include?: string;
  /** CSV of User attributes, e.g. "full_name,email,about". Requires `identity[email]` scope for `email`. */
  userFields?: string;
  /** CSV of Campaign attributes — only used when `include` contains `campaign`. */
  campaignFields?: string;
  /** CSV of Member attributes — only used when `include` contains `memberships`. */
  memberFields?: string;
}

const getIdentity: ActionDefinition<Input> = {
  key: "get-identity",
  type: "read",
  resource: "identity",
  title: "Get Identity",
  description: "Fetch the current OAuth user (GET /identity). Requires the `identity` scope; add " +
    "`identity[email]` to receive the email attribute, `campaigns` to include the user's " +
    "own campaign, and `identity.memberships` to include memberships to OTHER creators' " +
    "campaigns (without it, `memberships` still returns only this campaign's membership).",
  params: [
    {
      key: "include",
      label: "Include related resources",
      type: "string",
      hint: "CSV, e.g. memberships,campaign",
    },
    { key: "userFields", label: "User fields", type: "string", hint: "CSV, e.g. full_name,email" },
    { key: "campaignFields", label: "Campaign fields", type: "string", hint: "CSV" },
    { key: "memberFields", label: "Member fields", type: "string", hint: "CSV" },
  ],
  output: [
    { key: "data.id", type: "string", label: "User ID" },
    { key: "data.attributes", type: "object", label: "User attributes" },
  ],

  execute(input, ctx) {
    return new PatreonClient(ctx).request("/identity", {
      query: {
        include: input.include,
        "fields[user]": input.userFields,
        "fields[campaign]": input.campaignFields,
        "fields[member]": input.memberFields,
      },
    });
  },
};

export default getIdentity;
