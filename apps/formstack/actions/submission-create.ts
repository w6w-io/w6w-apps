import type { ActionDefinition } from "@w6w/types";
import { asJson, FormstackClient } from "../lib/client.ts";

/**
 * `POST /forms/{formId}/submissions` — submit an entry.
 *
 * The payload is keyed by field **id**, not by label — `{"12345": "Ada"}`. List
 * Form Fields is where those ids come from, and it also says which fields are
 * required.
 *
 * This app sends JSON: Formstack defaults to url-encoded input and only accepts
 * JSON when the `Content-Type` says so, which `lib/client.ts` always sets.
 * Structured field values (matrix, checkbox groups) do not survive url-encoding
 * intact, so the JSON path is the correct one.
 *
 * Not idempotent: Formstack has no idempotency key here, and running it twice
 * records two entries — which, for a form, means two real responses.
 */
interface Input {
  formId: string;
  fields: unknown;
}

const submissionCreate: ActionDefinition<Input> = {
  key: "submission-create",
  type: "perform",
  resource: "submission",
  title: "Create Submission",
  description: "Submit an entry to a form. Field values are keyed by field id, not by label.",
  idempotent: false,
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "fields",
      label: "Field values",
      type: "json",
      required: true,
      hint:
        'An object keyed by field id — `{"12345": "Ada", "12346": "ada@example.com"}`. Run List ' +
        "Form Fields for the ids and to see which are required.",
    },
  ],
  output: [{ key: "id", type: "string", label: "The created submission's id" }],

  execute(input, ctx) {
    const fields = asJson<Record<string, unknown>>(input.fields, "Field values");
    if (typeof fields !== "object" || Array.isArray(fields)) {
      throw new Error('Field values must be an object keyed by field id, e.g. {"12345": "Ada"}.');
    }
    if (Object.keys(fields).length === 0) throw new Error("Field values is empty");

    return new FormstackClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/submissions`,
      { method: "POST", body: fields },
    );
  },
};

export default submissionCreate;
