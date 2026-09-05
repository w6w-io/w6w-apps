import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { type CollectionInput, collectionParams, collectionQuery } from "../lib/params.ts";

/** `GET /1/Contacts` — a collection of contacts. */
type Input = CollectionInput;

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "Retrieve a collection of contacts, filtered, sorted and paginated.",
  params: collectionParams,
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "count", type: "number", label: "Count (if requested elsewhere)" },
  ],

  async execute(input, ctx) {
    const { items, count } = await new OntraportClient(ctx).list("/Contacts", {
      query: collectionQuery(input),
    });
    return { items, count };
  },
};

export default contactList;
