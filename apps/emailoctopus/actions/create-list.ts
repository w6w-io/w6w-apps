import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `POST /lists` — 201 with the new list.
 *
 * `idempotent: false`, and honestly so: EmailOctopus imposes no uniqueness on
 * list names, so a retry after a timeout creates a second list with the same
 * name rather than returning the first. The v2 spec documents no idempotency
 * key for this endpoint, so there is nothing to key a retry on.
 */
const createList: ActionDefinition<Input> = {
  key: "create-list",
  type: "perform",
  resource: "list",
  title: "Create List",
  description:
    "Create a new contact list. Name is the only accepted attribute (255 characters maximum); double opt-in and custom fields are configured afterwards.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "New clients list",
      validation: { maxLength: 255 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "double_opt_in", type: "boolean", label: "Double opt-in enabled" },
    { key: "counts", type: "object", label: "Contact counts by status" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request("/lists", {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default createList;
