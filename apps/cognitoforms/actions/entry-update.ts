import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  entryId: string;
  role?: string;
  data: Record<string, unknown>;
}

/**
 * PATCH /forms/{formId}/entries/{entryId} — update an existing entry. Only the properties you send
 * are changed; to clear an array set it to `[]`, and setting a section/multi-property field to
 * `null` clears all of its children. Calculation and file-upload fields cannot be set. Requires
 * `Entry:Read/Write`.
 */
const entryUpdate: ActionDefinition<Input> = {
  key: "entry-update",
  type: "perform",
  resource: "entry",
  title: "Update Entry",
  description: "Update an existing entry's field data.",
  // A field-set update against a known entry id: replaying it lands the same values on the same
  // record.
  idempotent: true,
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "entryId",
      label: "Entry ID",
      type: "string",
      required: true,
      hint: "Get IDs from a webhook payload, an import result, or another system's own record.",
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      default: "Internal",
      options: [
        { value: "Public", label: "Public" },
        { value: "Internal", label: "Internal" },
        { value: "Reviewer", label: "Reviewer" },
      ],
      hint: "The role the update is made as.",
    },
    {
      key: "data",
      label: "Fields to set",
      type: "json",
      required: true,
      hint: "Map of field name to new value, matching the property names from Get Form Schema. " +
        "Only the keys you send are changed.",
    },
  ],
  output: [
    { key: "entry", type: "object", label: "Updated entry (all data, not just what changed)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "updating Cognito Forms entry", {
      formId: input.formId,
      entryId: input.entryId,
    });
    const entry = await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/entries/${encodeURIComponent(input.entryId)}`,
      {
        method: "PATCH",
        body: {
          ...(input.data ?? {}),
          Entry: { Action: "Update", Role: input.role ?? "Internal" },
        },
      },
    );
    return { entry };
  },
};

export default entryUpdate;
