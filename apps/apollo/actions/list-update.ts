import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";

/** `PATCH /labels/{id}` — rename a list, or flag/unflag an accounts list as Book of Business. */
interface Input {
  id: string;
  name: string;
  book_of_business?: boolean;
}

const listUpdate: ActionDefinition<Input> = {
  key: "list-update",
  type: "perform",
  resource: "list",
  title: "Update List",
  description: "Rename a list, or flag an accounts list as Book of Business.",
  // A PATCH that sets absolute field values converges to the same end state on retry.
  idempotent: true,
  params: [
    { key: "id", label: "List", type: "string", required: true },
    { key: "name", label: "New name", type: "string", required: true },
    { key: "book_of_business", label: "Book of Business list", type: "boolean", advanced: true },
  ],
  output: [{ key: "list", type: "object", label: "The updated list" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).patch<{ label?: unknown }>(
      `/labels/${encodeId(input.id)}`,
      { body: compact({ name: input.name, book_of_business: input.book_of_business }) },
    );
    return { list: body.label ?? null };
  },
};

export default listUpdate;
