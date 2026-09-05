import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient, json } from "../lib/client.ts";
import { DOCTYPE_PARAM, NAME_PARAM } from "../lib/params.ts";

interface Input {
  doctype: string;
  name: string;
  values: unknown;
}

/**
 * `PUT /api/resource/:doctype/:name` — update a document of any DocType.
 *
 * Per the docs: "You don't need to send the whole document, instead you can
 * just send the fields that you want to update" — this is a patch, not a
 * replace. Fields left out of Values are untouched.
 *
 * `idempotent: true`: sending the same values twice leaves the document in
 * the same state, so a retry is safe. The one thing this promise does not
 * cover is a submittable DocType whose fields are locked after submission —
 * that request fails with Frappe's own `UpdateAfterSubmitError` (417) rather
 * than silently doing nothing, on both the first and every later attempt.
 */
const updateDocument: ActionDefinition<Input> = {
  key: "update-document",
  type: "perform",
  title: "Update Document",
  description: "Update a document of any DocType by its `name`. Only the fields present in " +
    "Values are changed — everything else is left alone.",
  idempotent: true,
  params: [
    DOCTYPE_PARAM,
    NAME_PARAM,
    {
      key: "values",
      label: "Values",
      type: "json",
      required: true,
      placeholder: '{"status": "Closed"}',
      hint: "JSON object of the fields to change.",
    },
  ],
  output: [{ key: "document", type: "object", label: "The updated document" }],

  async execute(input, ctx) {
    const values = json(input.values, "Values");
    if (typeof values !== "object" || values === null || Array.isArray(values)) {
      throw new Error("Values must be a JSON object.");
    }

    const body = await new ErpNextClient(ctx).resource<{ data: Record<string, unknown> }>(
      `/${encodeURIComponent(input.doctype)}/${encodeURIComponent(input.name)}`,
      { method: "PUT", body: values },
    );
    return { document: body?.data ?? {} };
  },
};

export default updateDocument;
