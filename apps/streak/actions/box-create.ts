import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient, toJsonString } from "../lib/client.ts";
import { pipelineKeyParam } from "../lib/params.ts";

/**
 * `POST /pipelines/{pipelineKey}/boxes` — create a box (record).
 *
 * `assignedToSharingEntries` here is documented as a **string**: "an array of
 * objects with `email` properties encoded as a JSON string," e.g.
 * `[{"email":"ginny@weasley.com"}]` — double-JSON-encoded inside the outer
 * JSON body. This is a DIFFERENT shape from the same-named field on
 * `box-update`, which takes a plain array of user *keys*, not emails, and is
 * not stringified. Getting either half of that swapped is a silent 400 with
 * an empty body.
 */
interface Input {
  pipelineKey: string;
  name: string;
  stageKey?: string;
  notes?: string;
  assignedToEmails?: string[];
}

const boxCreate: ActionDefinition<Input> = {
  key: "box-create",
  type: "perform",
  resource: "box",
  title: "Create Box",
  description: "Create a new box (record) in a pipeline.",
  idempotent: false,
  params: [
    pipelineKeyParam,
    { key: "name", label: "Name", type: "string", required: true },
    { key: "stageKey", label: "Stage Key", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "assignedToEmails",
      label: "Assign To (emails)",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Email addresses of team members to assign. They must already have access to this " +
        "pipeline.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created box" }],

  execute(input, ctx) {
    const assignedToSharingEntries = input.assignedToEmails?.length
      ? toJsonString(input.assignedToEmails.map((email) => ({ email })))
      : undefined;
    return new StreakClient(ctx).sendJson(
      "POST",
      `/pipelines/${encodeId(input.pipelineKey)}/boxes`,
      {
        name: input.name,
        stageKey: input.stageKey,
        notes: input.notes,
        assignedToSharingEntries,
      },
    );
  },
};

export default boxCreate;
