import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient, toIdList, toList } from "../lib/client.ts";
import { paginationParams, userStatusOptions } from "../lib/params.ts";

/**
 * `GET /users/v1/users` — list employees, with the filters Connecteam
 * actually documents: id/name/phone/email lists, status, and three
 * created-at / modified-at / last-login Unix-timestamp floors.
 *
 * There is no single-user "get" endpoint in this API — only this list (with
 * `userIds` narrowed to one) and a bulk delete/archive. Filtering this list
 * by `userIds` is the documented way to fetch one employee by id.
 */
interface Input {
  userIds?: string;
  userStatus?: string;
  fullNames?: string;
  phoneNumbers?: string;
  emailAddresses?: string;
  createdAt?: number;
  modifiedAt?: number;
  lastLogin?: number;
  limit?: number;
  offset?: number;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List employees, optionally filtered by id, name, phone, email or status.",
  params: [
    { key: "userIds", label: "User IDs", type: "string", hint: "Comma-separated numeric ids." },
    {
      key: "userStatus",
      label: "Status",
      type: "select",
      options: userStatusOptions,
      hint: "Defaults to active.",
    },
    {
      key: "fullNames",
      label: "Full names",
      type: "string",
      hint: "Comma-separated. Exact first + last name as shown in the app (case-insensitive).",
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "string",
      hint: "Comma-separated, in +<country code><number> format.",
    },
    { key: "emailAddresses", label: "Email addresses", type: "string", hint: "Comma-separated." },
    {
      key: "createdAt",
      label: "Created after",
      type: "number",
      hint: "Unix timestamp (seconds). Only users created after this.",
    },
    {
      key: "modifiedAt",
      label: "Modified after",
      type: "number",
      hint: "Unix timestamp (seconds). Only users with a field changed after this.",
    },
    {
      key: "lastLogin",
      label: "Logged in after",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    ...paginationParams(500),
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "total", type: "number", label: "Total matching users (when computed)" },
  ],

  async execute(input, ctx) {
    const { data, paging } = await new ConnecteamClient(ctx).page<{ users: unknown[] }>(
      "/users/v1/users",
      {
        query: {
          userIds: toIdList(input.userIds),
          userStatus: input.userStatus,
          fullNames: toList(input.fullNames),
          phoneNumbers: toList(input.phoneNumbers),
          emailAddresses: toList(input.emailAddresses),
          createdAt: input.createdAt,
          modifiedAt: input.modifiedAt,
          lastLogin: input.lastLogin,
          limit: input.limit,
          offset: input.offset,
        },
      },
    );
    return { users: data.users ?? [], ...paging };
  },
};

export default userList;
