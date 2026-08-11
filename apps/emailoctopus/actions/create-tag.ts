import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
  tag: string;
}

/**
 * `POST /lists/{list_id}/tags` — 201 with `{ tag }`.
 *
 * `idempotent: false`: creating a tag the list already has is documented as an
 * `already-exists` conflict (409), not a no-op.
 *
 * Creating a tag here only *defines* it on the list. Attaching it to a contact
 * is a separate call — see `upsert-contact` / `update-contact`, whose `tags`
 * object is the only way to add or remove a tag on a contact.
 */
const createTag: ActionDefinition<Input> = {
  key: "create-tag",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description:
    "Define a tag on a list. This only creates the tag; attaching it to a contact is done through the contact update endpoints. A tag the list already has returns a 409 conflict.",
  idempotent: false,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    { key: "tag", label: "Tag", type: "string", required: true, placeholder: "vip" },
  ],
  output: [{ key: "tag", type: "string", label: "The created tag" }],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request(`/lists/${seg(input.listId)}/tags`, {
      method: "POST",
      body: { tag: input.tag },
    });
  },
};

export default createTag;
