import type { ActionDefinition } from "@w6w/types";
import { contactKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/** `GET /contacts/{contactKey}`. */
interface Input {
  contactKey: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact.",
  params: [contactKeyParam],
  output: [{ key: "data", type: "object", label: "The contact" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(`/contacts/${encodeId(input.contactKey)}`);
  },
};

export default contactGet;
