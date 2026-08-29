import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";

/** `GET /contacts/{contact_id}` — one contact already saved in your Apollo instance. */
interface Input {
  contact_id: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact already saved in your Apollo instance, by its Apollo ID.",
  params: [{ key: "contact_id", label: "Contact", type: "string", required: true }],
  output: [{ key: "contact", type: "object", label: "The contact" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).get<{ contact?: unknown }>(
      `/contacts/${encodeId(input.contact_id)}`,
    );
    return { contact: body.contact ?? null };
  },
};

export default contactGet;
