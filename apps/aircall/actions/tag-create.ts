import type { ActionDefinition } from "@w6w/types";
import { AircallClient } from "../lib/client.ts";

interface Input {
  name: string;
  color: string;
}

/**
 * `POST /v1/tags` — create a call Tag. Answers **201**.
 *
 * Both fields are mandatory, and `color` must be hexadecimal — Aircall validates
 * it and returns 400 otherwise. `name` must be **unique in the company**, which
 * is what makes this action non-retryable: a replay after a create that actually
 * succeeded comes back 400, not 200.
 *
 * Emojis are stripped from a Tag's attributes, silently.
 */
const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a call Tag with a name and a hex colour. Names must be unique company-wide.",
  // Not retryable: the name is unique, so replaying a create that already
  // succeeded fails with a 400 rather than returning the existing Tag. There is
  // no upsert.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "VIP Customer",
      hint: "Must be unique across the company. Emojis are stripped.",
    },
    {
      key: "color",
      label: "Colour",
      type: "string",
      required: true,
      placeholder: "#00B388",
      validation: { pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
      hint: "Hexadecimal. Aircall rejects anything else with a 400.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Tag ID — pass this to Tag Call" },
    { key: "name", type: "string", label: "Tag name" },
    { key: "color", type: "string", label: "Hexadecimal colour" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity("/tags", "tag", {
      method: "POST",
      body: { name: input.name, color: input.color },
    });
  },
};

export default tagCreate;
