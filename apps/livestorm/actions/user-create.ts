import type { ActionDefinition } from "@w6w/types";
import { buildBody, compact, LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

interface Input {
  email: string;
  role?: string;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Invite Team Member",
  description: "Invite a new team member (user) to your organization by email.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { label: "Host", value: "host" },
        { label: "Moderator", value: "moderator" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(input, ctx) {
    const body = buildBody("users", compact({ email: input.email, role: input.role }));
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>("/users", {
      method: "POST",
      body,
    });
    return res.data;
  },
};

export default userCreate;
