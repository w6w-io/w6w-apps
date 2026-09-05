import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient } from "../lib/client.ts";

/**
 * `POST /api/v2/lists` — create a contact list (a "group" in TextMagic's UI).
 *
 * Not to be confused with **Distribution Lists** (`/api/v2/distribution-lists`),
 * a separate email-to-SMS forwarding feature with its own recipients model —
 * this app deliberately covers only `Lists`, the plain contact grouping used
 * to target `message-send` and to organize `contact-create`.
 */
interface Input {
  name: string;
  shared?: boolean;
  favorited?: boolean;
  isDefault?: boolean;
}

const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create a new contact list.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "shared", label: "Shared among sub-accounts", type: "boolean", default: false },
    { key: "favorited", label: "Favorited", type: "boolean", default: false },
    { key: "isDefault", label: "Default list", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "number", label: "List ID" },
    { key: "href", type: "string", label: "URI of the created list" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json("/lists", { method: "POST", body: compact({ ...input }) });
  },
};

export default listCreate;
