import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";

/** `GET /api/v2/emails/{id}` — read one email. */
interface Input {
  id: string;
}

const emailGet: ActionDefinition<Input> = {
  key: "email-get",
  type: "read",
  resource: "email",
  title: "Get Email",
  description: "Read a single email by ID.",
  params: [
    {
      key: "id",
      label: "Email",
      type: "string",
      required: true,
      hint: "Email ID, from a List Emails result.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Email ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "body", type: "object", label: "Body" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(`/emails/${encodeURIComponent(input.id)}`);
  },
};

export default emailGet;
