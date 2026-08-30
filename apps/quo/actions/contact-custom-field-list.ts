import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `GET /v1/contact-custom-fields` — list this workspace's custom contact field definitions
 * (key, name, type). Definitions can only be created or edited inside the Quo app — the API can
 * only read them and set VALUES for them on a contact (see `contact-create`/`contact-update`).
 */
type Input = Record<string, never>;

const contactCustomFieldList: ActionDefinition<Input> = {
  key: "contact-custom-field-list",
  type: "search",
  resource: "contact",
  title: "List Contact Custom Fields",
  description: "List this workspace's custom contact field definitions. Fields are defined in " +
    "the Quo app only — this endpoint is read-only.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Custom field definitions (name, key, type)" },
  ],

  execute(_input, ctx) {
    return new QuoClient(ctx).json("/contact-custom-fields");
  },
};

export default contactCustomFieldList;
