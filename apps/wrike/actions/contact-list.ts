import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, toList, WrikeClient } from "../lib/client.ts";
import { contactTypeOptions } from "../lib/params.ts";

/**
 * `GET /contacts` — list the users and groups in the current account.
 *
 * "Contact" is Wrike's umbrella term for people, groups, equipment assets and
 * robot (integration) users — `types` filters among them. Set `me` to fetch
 * only the requesting user's own contact record, the same call
 * `auth/permanent-token.ts` uses to label a Connection.
 */
interface Input {
  me?: boolean;
  active?: boolean;
  name?: string;
  types?: string[] | string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts (users and groups) in the current account.",
  params: [
    {
      key: "me",
      label: "Only me",
      type: "boolean",
      hint: "Return only the requesting user's own contact record.",
    },
    { key: "active", label: "Active only", type: "boolean" },
    { key: "name", label: "Name contains", type: "string" },
    { key: "types", label: "Contact type", type: "multiselect", options: contactTypeOptions },
  ],
  output: [{ key: "items", type: "array", label: "Contacts" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list("/contacts", {
      query: {
        me: input.me,
        active: input.active,
        name: input.name,
        types: toList(input.types),
      },
    });
    return { items };
  },
};

export default contactList;
