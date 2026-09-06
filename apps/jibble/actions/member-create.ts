import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";

/**
 * `POST /v1/People` — invite or create a member.
 *
 * `sendInviteEmail` maps to the vendor's own oddly-cased field,
 * `IPersonSetting/SendInviteEmail`, exactly as shown in the collection's "Create Member"
 * example — the slash is part of the literal field name, not a typo.
 */
interface Input {
  fullName: string;
  email?: string;
  code?: string;
  sendInviteEmail?: boolean;
}

const memberCreate: ActionDefinition<Input> = {
  key: "member-create",
  type: "perform",
  resource: "member",
  title: "Create Member",
  description: "Create (and optionally invite) a new organization member.",
  idempotent: false,
  params: [
    { key: "fullName", label: "Full name", type: "string", required: true },
    { key: "email", label: "Email", type: "string" },
    {
      key: "code",
      label: "External code",
      type: "string",
      hint: "An external identifier, e.g. an id from another HR system.",
    },
    {
      key: "sendInviteEmail",
      label: "Send invite email",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    if (!input.fullName) throw new Error("fullName is required");
    return await new JibbleClient(ctx).json(WORKSPACE_HOST, "/v1/People", {
      method: "POST",
      body: {
        fullName: input.fullName,
        email: input.email || undefined,
        code: input.code || undefined,
        "IPersonSetting/SendInviteEmail": input.sendInviteEmail ?? false,
      },
    });
  },
};

export default memberCreate;
