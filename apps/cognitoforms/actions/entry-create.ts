import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  role?: string;
  data: Record<string, unknown>;
}

/**
 * POST /forms/{formId}/entries — create an entry. Use Get Form Schema to see which top-level
 * properties the form accepts. Calculation fields update automatically and cannot be set directly;
 * file-upload fields cannot be set via the API. Requires `Entry:Read/Write`.
 *
 * `Entry.Action` is fixed to `"Submit"` — the vendor docs' own example pairs Create with `Submit`
 * and Update with `Update`, and this app splits create/update into separate Actions rather than
 * exposing `Action` as a param that could contradict which endpoint is being called.
 */
const entryCreate: ActionDefinition<Input> = {
  key: "entry-create",
  type: "perform",
  resource: "entry",
  title: "Create Entry",
  description: "Submit a new entry to a form.",
  // Cognito Forms mints a fresh entry per POST with no request key to dedupe on; a retry creates
  // a second entry.
  idempotent: false,
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      default: "Public",
      options: [
        { value: "Public", label: "Public" },
        { value: "Internal", label: "Internal" },
        { value: "Reviewer", label: "Reviewer" },
      ],
      hint: "The role the entry is submitted as.",
    },
    {
      key: "data",
      label: "Entry data",
      type: "json",
      required: true,
      hint: "Map of field name to value, matching the property names from Get Form Schema, e.g. " +
        '{"Name": {"First": "Jane", "Last": "Doe"}, "Email": "jane@example.com"}.',
    },
  ],
  output: [
    { key: "entry", type: "object", label: "Created entry, including its Id" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Cognito Forms entry", { formId: input.formId });
    const entry = await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/entries`,
      {
        method: "POST",
        body: {
          ...(input.data ?? {}),
          Entry: { Action: "Submit", Role: input.role ?? "Public" },
        },
      },
    );
    return { entry };
  },
};

export default entryCreate;
