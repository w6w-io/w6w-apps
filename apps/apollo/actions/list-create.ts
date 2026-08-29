import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { listModalityOptions } from "../lib/params.ts";

/**
 * `POST /labels` — create a new saved list ("label" in the API, "list" in the Apollo
 * UI). The name must be unique within the given modality for your team.
 */
interface Input {
  name: string;
  modality: "contacts" | "accounts";
  book_of_business?: boolean;
}

const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: 'Create a new list ("label"). The name must be unique for the given record type.',
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "modality",
      label: "Record type",
      type: "select",
      required: true,
      options: listModalityOptions,
    },
    {
      key: "book_of_business",
      label: "Book of Business list",
      type: "boolean",
      advanced: true,
      hint: "Accounts lists only.",
    },
  ],
  output: [{ key: "list", type: "object", label: "The created list" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ label?: unknown }>("/labels", {
      body: compact({
        name: input.name,
        modality: input.modality,
        book_of_business: input.book_of_business,
      }),
    });
    return { list: body.label ?? null };
  },
};

export default listCreate;
