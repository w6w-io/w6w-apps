import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, encodeId, StreakClient, toJsonString } from "../lib/client.ts";
import { boxKeyParam } from "../lib/params.ts";

/**
 * `POST /boxes/{boxKey}` — edit a box's properties.
 *
 * Two shapes worth calling out:
 *
 *  - `assignedToSharingEntries` here is a plain array of user **keys** —
 *    unlike `box-create`'s same-named field, which is a JSON-STRING of
 *    `{email}` objects. See `box-create.ts`.
 *  - `fields` is documented `type: "string", format: "json"`: a JSON object
 *    of `{fieldKey: value}` pairs, itself encoded as a string inside the
 *    outer JSON body (e.g. `"{\"1007\":\"a value\",\"1039\":42}"`). This
 *    action accepts a normal object for `fields` and re-encodes it.
 */
interface Input {
  boxKey: string;
  name?: string;
  notes?: string;
  stageKey?: string;
  assignedToUserKeys?: string[];
  fields?: unknown;
}

const boxUpdate: ActionDefinition<Input> = {
  key: "box-update",
  type: "perform",
  resource: "box",
  title: "Update Box",
  description: "Edit a box's name, notes, stage, assignees or custom field values.",
  idempotent: true,
  params: [
    boxKeyParam,
    { key: "name", label: "Name", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "stageKey", label: "Stage Key", type: "string" },
    {
      key: "assignedToUserKeys",
      label: "Assign To (user keys)",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Streak user keys, not emails. Sending an empty list unassigns the box.",
    },
    {
      key: "fields",
      label: "Field Values",
      type: "json",
      advanced: true,
      hint: 'Object of fieldKey -> value, e.g. { "1007": "a value", "1039": 42 }.',
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated box" }],

  execute(input, ctx) {
    const fields = asOptionalJson<Record<string, unknown>>(input.fields, "fields");
    return new StreakClient(ctx).sendJson(
      "POST",
      `/boxes/${encodeId(input.boxKey)}`,
      {
        name: input.name,
        notes: input.notes,
        stageKey: input.stageKey,
        assignedToSharingEntries: input.assignedToUserKeys,
        fields: fields ? toJsonString(fields) : undefined,
      },
    );
  },
};

export default boxUpdate;
