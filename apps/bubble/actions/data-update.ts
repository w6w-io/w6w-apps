import type { ActionDefinition } from "@w6w/types";
import { BubbleClient, formatTypeName, parseJson } from "../lib/client.ts";
import { TYPE_PARAM, UNIQUE_ID_PARAM } from "../lib/params.ts";

interface Input {
  type: string;
  uniqueId: string;
  fields: string | Record<string, unknown>;
}

/**
 * `PATCH /obj/{type}/{UniqueID}` — verified against
 * `core-resources/api/the-bubble-api/the-data-api/data-api-requests`.
 *
 * Modify only the given fields of one thing — every field left out is
 * untouched, unlike `data-replace` (PUT), which resets them. Answers `204`
 * with no body on success. The Data Type's Privacy Rule must have
 * `Modify via API` enabled and must still permit the change after it is
 * applied — Bubble refuses a modification that would take away the caller's
 * own ability to modify the record further.
 */
const action: ActionDefinition<Input, { ok: true }> = {
  key: "data-update",
  type: "perform",
  resource: "data",
  title: "Update Thing",
  description: "Change one or more fields of a thing, leaving the rest untouched.",
  // Sending the same fields twice leaves the record in the same state.
  idempotent: true,
  params: [
    TYPE_PARAM,
    UNIQUE_ID_PARAM,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Object of field name → new value, e.g. `{"Unit name": "New name"}`.',
    },
  ],

  async execute(input, ctx) {
    const type = formatTypeName(input.type);
    const fields = parseJson(input.fields, "fields");
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new Error("`fields` must be a JSON object");
    }
    const client = new BubbleClient(ctx);
    ctx.log("info", "updating Bubble thing", { type, uniqueId: input.uniqueId });
    await client.request(`/obj/${type}/${encodeURIComponent(input.uniqueId)}`, {
      method: "PATCH",
      json: fields,
    });
    return { ok: true };
  },
};

export default action;
