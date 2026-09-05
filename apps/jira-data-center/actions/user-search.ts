import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient } from "../lib/client.ts";

interface Input {
  username: string;
  includeActive?: boolean;
  includeInactive?: boolean;
  maxResults?: number;
  startAt?: number;
}

/**
 * The source of the usernames the issue actions want. Unlike Jira Cloud
 * (which replaced this with an opaque `accountId`), Data Center still
 * identifies users by their login username.
 */
const userSearch: ActionDefinition<Input, unknown[]> = {
  key: "user-search",
  type: "search",
  resource: "user",
  title: "Search Users",
  description: "Find users by name, username or email fragment.",
  params: [
    {
      key: "username",
      label: "Query",
      type: "string",
      required: true,
      hint: "Matched against username, display name and email — despite the parameter name, " +
        "this is a substring search, not an exact username lookup (use `user-get` for that).",
    },
    { key: "includeActive", label: "Include active users", type: "boolean", default: true },
    { key: "includeInactive", label: "Include inactive users", type: "boolean", default: false },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      default: 50,
      row: "page",
      validation: { min: 1, integer: true },
    },
    {
      key: "startAt",
      label: "Start at",
      type: "number",
      default: 0,
      row: "page",
      validation: { min: 0, integer: true },
    },
  ],
  output: [{ key: "", type: "array", label: "Users" }],

  execute(input, ctx) {
    return new JiraDcClient(ctx).request<unknown[]>("/user/search", {
      query: {
        username: input.username,
        includeActive: input.includeActive,
        includeInactive: input.includeInactive,
        maxResults: input.maxResults,
        startAt: input.startAt,
      },
    });
  },
};

export default userSearch;
