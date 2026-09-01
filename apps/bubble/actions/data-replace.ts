import type { ActionDefinition } from "@w6w/types";
import { BubbleClient, formatTypeName, parseJson } from "../lib/client.ts";
import { TYPE_PARAM, UNIQUE_ID_PARAM } from "../lib/params.ts";

interface Input {
  type: string;
  uniqueId: string;
  fields: string | Record<string, unknown>;
}

/**
 * `PUT /obj/{type}/{UniqueID}` — verified against
 * `core-resources/api/the-bubble-api/the-data-api/data-api-requests`.
 *
 * Overwrites every editable field on a thing: anything not included here is
 * cleared, or reset to its Data Type default — the opposite of `data-update`
 * (PATCH), which only touches the fields given. `Unique ID`, `Created Date`
 * and `Modified Date` are never affected. Answers `204` with no body.
 */
const action: ActionDefinition<Input, { ok: true }> = {
  key: "data-replace",
  type: "perform",
  resource: "data",
  title: "Replace Thing",
  description:
    "Overwrite every editable field of a thing. Fields left out are cleared or reset to " +
    "their default — use Update Thing to change only some fields.",
  // Replacing with the same body twice leaves the record in the same state.
  idempotent: true,
  params: [
    TYPE_PARAM,
    UNIQUE_ID_PARAM,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Object of field name → value for every editable field. Anything omitted is cleared.",
    },
  ],

  async execute(input, ctx) {
    const type = formatTypeName(input.type);
    const fields = parseJson(input.fields, "fields");
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new Error("`fields` must be a JSON object");
    }
    const client = new BubbleClient(ctx);
    ctx.log("info", "replacing Bubble thing", { type, uniqueId: input.uniqueId });
    await client.request(`/obj/${type}/${encodeURIComponent(input.uniqueId)}`, {
      method: "PUT",
      json: fields,
    });
    return { ok: true };
  },
};

export default action;
