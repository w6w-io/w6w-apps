import type { ActionDefinition } from "@w6w/types";
import { FormstackClient } from "../lib/client.ts";

/**
 * `GET /forms/{formId}/fields` — a form's fields.
 *
 * Read this before Create Submission: a submission's payload is keyed by field
 * **id**, and this is the only place those ids, their types and their `required`
 * flags are published.
 *
 * It is also what makes List Submissions legible — with `dataFormat: legacy`
 * (the default) a submission's `data` is an object keyed by the same ids.
 */
interface Input {
  formId: string;
}

const formFields: ActionDefinition<Input> = {
  key: "form-fields",
  type: "search",
  resource: "field",
  title: "List Form Fields",
  description:
    "List a form's fields — id, type, label and whether each is required. Read this before " +
    "creating a submission.",
  params: [{ key: "formId", label: "Form ID", type: "string", required: true }],
  output: [{ key: "data", type: "array", label: "Fields — `id` is what a submission is keyed by" }],

  execute(input, ctx) {
    return new FormstackClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/fields`,
    );
  },
};

export default formFields;
