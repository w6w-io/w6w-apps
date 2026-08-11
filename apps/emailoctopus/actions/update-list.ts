import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
  name: string;
}

/**
 * `PUT /lists/{list_id}`.
 *
 * `idempotent: true` — the body is a full replacement of the only mutable
 * attribute, so replaying it converges on the same state.
 */
const updateList: ActionDefinition<Input> = {
  key: "update-list",
  type: "perform",
  resource: "list",
  title: "Update List",
  description:
    "Rename a list. `name` is the only attribute the v2 API accepts here — double opt-in cannot be toggled through the API.",
  idempotent: true,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "last_updated_at", type: "string", label: "Last updated at (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request(`/lists/${seg(input.listId)}`, {
      method: "PUT",
      body: { name: input.name },
    });
  },
};

export default updateList;
