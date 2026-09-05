import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient, json } from "../lib/client.ts";
import { DOCTYPE_PARAM } from "../lib/params.ts";

interface Input {
  doctype: string;
  values: unknown;
}

/**
 * `POST /api/resource/:doctype` — create a document of any DocType.
 *
 * Verified against `docs.frappe.io/framework/user/en/api/rest` (fetched
 * 2026-09-05): send the field values as a JSON object in the body, get the
 * full created document back under `data`, including whatever `name` Frappe
 * assigned it (a random hash by default, or a formatted series like
 * `SAL-ORD-2026-00042` when the DocType configures an autoname series).
 *
 * `idempotent: false` — the honest answer. A create has no natural key here:
 * retrying with the same values makes a second, distinct document rather than
 * confirming the first one exists.
 */
const createDocument: ActionDefinition<Input> = {
  key: "create-document",
  type: "perform",
  title: "Create Document",
  description: "Create a new document of any DocType — Customer, Sales Order, Item, Lead, or " +
    "any other DocType this site has installed.",
  idempotent: false,
  params: [
    DOCTYPE_PARAM,
    {
      key: "values",
      label: "Values",
      type: "json",
      required: true,
      placeholder: '{"customer_name": "Acme Inc", "customer_type": "Company"}',
      hint: "JSON object of field values for the new document. Mandatory fields depend on the " +
        "DocType — use ERPNext's own New form once to see which fields it requires.",
    },
  ],
  output: [{ key: "document", type: "object", label: "The created document" }],

  async execute(input, ctx) {
    const values = json(input.values, "Values");
    if (typeof values !== "object" || values === null || Array.isArray(values)) {
      throw new Error("Values must be a JSON object.");
    }

    const body = await new ErpNextClient(ctx).resource<{ data: Record<string, unknown> }>(
      `/${encodeURIComponent(input.doctype)}`,
      { method: "POST", body: values },
    );
    return { document: body?.data ?? {} };
  },
};

export default createDocument;
