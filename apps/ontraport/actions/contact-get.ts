import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /1/Contact` — every field of one contact. */
interface Input {
  id: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch all information for a single contact by ID.",
  params: [idParam],
  output: [{ key: "data", type: "object", label: "The contact" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/Contact", { query: { id: input.id } });
  },
};

export default contactGet;
