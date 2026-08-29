import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, type DialpadPage } from "../lib/client.ts";
import { cursorParam } from "../lib/params.ts";

/**
 * `GET /api/v2/contacts` — company shared contacts, or one user's local
 * contacts when `owner_id` is provided.
 *
 * `limit` is soft-deprecated the same way `users.list`'s is — this app never
 * sends it.
 */
interface Input {
  name?: string;
  cursor?: string;
  includeLocal?: boolean;
  ownerId?: string;
}

const contactsList: ActionDefinition<Input> = {
  key: "contacts-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List shared company contacts, or one user's local contacts when Owner ID is set.",
  params: [
    { key: "name", label: "Name search", type: "string", hint: "Filter contacts by name." },
    cursorParam,
    {
      key: "includeLocal",
      label: "Include local contacts",
      type: "boolean",
      hint: "Include company local contacts too. Defaults to false.",
    },
    {
      key: "ownerId",
      label: "Owner user ID",
      type: "string",
      hint: "Return this user's local contacts instead of the company's shared ones.",
    },
  ],
  output: [
    { key: "cursor", type: "string", label: "Next page cursor (null on the last page)" },
    { key: "items", type: "array", label: "Contacts on this page" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json<DialpadPage<unknown>>("/contacts", {
      query: {
        name: input.name,
        cursor: input.cursor,
        include_local: input.includeLocal,
        owner_id: input.ownerId,
      },
    });
  },
};

export default contactsList;
