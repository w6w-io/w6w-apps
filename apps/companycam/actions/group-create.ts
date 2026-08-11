import type { ActionDefinition } from "@w6w/types";
import { compact, CompanyCamClient, toList } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `POST /v2/groups` — create a user group.
 *
 * Body nests: `{"group": {"name": "…", "users": ["<user id>", …]}}`. The
 * `users` array takes **ids**, unlike the tag and label endpoints which take
 * display strings — the same-looking `string[]` means two different things in
 * this API depending on which resource it belongs to.
 *
 * Not idempotent: nothing prevents two groups with the same name.
 */
interface Input {
  name: string;
  users?: string[] | string;
  actAs?: string;
}

const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a user group, optionally with members.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "users",
      label: "Member user IDs",
      type: "string",
      repeat: true,
      hint: "User IDs, not email addresses — unlike tags, which take display values.",
    },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "users", type: "array", label: "Members" },
  ],

  execute(input, ctx) {
    const group = compact({ name: input.name, users: toList(input.users) });
    return new CompanyCamClient(ctx).json("/groups", {
      method: "POST",
      body: { group },
      actAs: input.actAs,
    });
  },
};

export default groupCreate;
