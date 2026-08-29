import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/**
 * `POST /contacts/update_stages` — move one or more contacts to a different contact
 * stage. Query parameters, not a JSON body — see `lib/client.ts`'s module doc.
 */
interface Input {
  contact_ids: string[] | string;
  contact_stage_id: string;
}

function toArr(v: string[] | string): string[] {
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const contactStageUpdate: ActionDefinition<Input> = {
  key: "contact-stage-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact Stage",
  description: "Move one or more contacts to a different contact stage.",
  // Setting the same stage on the same contacts again converges to the same end state.
  idempotent: true,
  params: [
    {
      key: "contact_ids",
      label: "Contacts",
      type: "string",
      required: true,
      hint: "Comma-separated Apollo contact IDs.",
    },
    {
      key: "contact_stage_id",
      label: "New contact stage",
      type: "string",
      required: true,
      hint: "From `contact-stage-list`.",
    },
  ],
  output: [{ key: "contacts", type: "array", label: "The updated contacts" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ contacts?: unknown[] }>(
      "/contacts/update_stages",
      {
        query: { contact_ids: toArr(input.contact_ids), contact_stage_id: input.contact_stage_id },
      },
    );
    return { contacts: body.contacts ?? [] };
  },
};

export default contactStageUpdate;
