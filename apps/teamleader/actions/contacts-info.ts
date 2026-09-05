import type { ActionDefinition } from "@w6w/types";
import { call, compact } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /contacts.info` — verified against
 * `developer.focus.teamleader.eu/docs/api/contacts-info` on 2026-09-01.
 */
interface Input {
  id: string;
  includes?: string;
}

const contactsInfo: ActionDefinition<Input> = {
  key: "contacts-info",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Get details for a single contact.",
  params: [
    idParam("Contact ID", "cde0bc5f-8602-4e12-b5d3-f03436b54c0d"),
    {
      key: "includes",
      label: "Includes",
      type: "string",
      placeholder: "custom_fields",
      hint: "Comma-separated list of optional includes.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "Contact" }],

  async execute(input, ctx) {
    const contact = await call(
      ctx,
      "contacts.info",
      compact({ id: input.id, includes: input.includes }),
    );
    return { contact };
  },
};

export default contactsInfo;
