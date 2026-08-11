import type { ActionDefinition } from "@w6w/types";
import { AircallClient, compact, encodeId } from "../lib/client.ts";
import { tagIdParam } from "../lib/params.ts";

interface Input {
  tagId: string;
  name?: string;
  color?: string;
}

/**
 * `PUT /v1/tags/:id` — rename or recolour a Tag.
 *
 * A PUT, unlike Update Contact's POST. Aircall's body table marks both `name`
 * and `color` "Mandatory field" while its own worked example sends `name`
 * alone and gets the existing colour back untouched — so the documentation
 * contradicts itself here. This action sends only the fields the caller
 * supplied, matching the example rather than the table, and requires at least
 * one so an empty PUT never reaches the wire.
 */
const tagUpdate: ActionDefinition<Input> = {
  key: "tag-update",
  type: "perform",
  resource: "tag",
  title: "Update Tag",
  description: "Rename a call Tag or change its hex colour.",
  // Safe to retry: sets named fields to given values.
  idempotent: true,
  params: [
    tagIdParam,
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Must stay unique across the company.",
    },
    {
      key: "color",
      label: "Colour",
      type: "string",
      placeholder: "#00B388",
      validation: { pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
      hint: "Hexadecimal.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
    { key: "color", type: "string", label: "Hexadecimal colour" },
  ],

  async execute(input, ctx) {
    const body = compact({ name: input.name, color: input.color });
    if (Object.keys(body).length === 0) {
      throw new Error("Update Tag needs a name, a colour, or both");
    }
    const client = new AircallClient(ctx);
    return await client.entity(`/tags/${encodeId(input.tagId)}`, "tag", { method: "PUT", body });
  },
};

export default tagUpdate;
