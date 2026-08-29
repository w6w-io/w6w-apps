import type { ActionDefinition } from "@w6w/types";
import { KustomerClient, unset } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
  userType?: string;
  email?: string;
  deleted?: boolean;
}

const userTypeOptions = [
  { value: "user", label: "User (agent)" },
  { value: "machine", label: "Machine / API user" },
  { value: "limited", label: "Collaborator" },
];

/** `GET /v1/users` — "Get Users", verified against the Access Management OAS. */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "Page through the users in your organization.",
  params: [
    { key: "userType", label: "User type", type: "select", options: userTypeOptions },
    { key: "email", label: "Email filter", type: "string" },
    { key: "deleted", label: "Include deleted", type: "boolean", default: false },
    ...pagination,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).json("/users", {
      query: {
        page: input.page,
        pageSize: input.pageSize,
        userType: unset(input.userType),
        email: unset(input.email),
        deleted: input.deleted,
      },
    });
  },
};

export default userList;
