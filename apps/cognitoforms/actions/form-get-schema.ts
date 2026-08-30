import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  input?: boolean;
  includeLinks?: boolean;
}

/**
 * GET /forms/{formId}/schema — every field on a form: its data type, description and valid values.
 * Use this to learn which top-level keys `Entry Create`/`Entry Update` accept before calling them.
 * Requires `Form:Read`.
 */
const formGetSchema: ActionDefinition<Input> = {
  key: "form-get-schema",
  type: "read",
  resource: "form",
  title: "Get Form Schema",
  description: "Retrieve the field schema for a form — types, descriptions and valid values.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "input",
      label: "Incoming-request shape",
      type: "boolean",
      default: false,
      hint: "When true, returns the schema shaped for what the API accepts (Create/Update Entry) " +
        "rather than what it returns.",
    },
    {
      key: "includeLinks",
      label: "Include links",
      type: "boolean",
      default: true,
      hint: "Whether HATEOAS-style links are included in the schema.",
    },
  ],
  output: [
    { key: "schema", type: "object", label: "Form schema" },
  ],

  async execute(input, ctx) {
    const schema = await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/schema`,
      {
        query: { input: input.input, includeLinks: input.includeLinks },
      },
    );
    return { schema };
  },
};

export default formGetSchema;
