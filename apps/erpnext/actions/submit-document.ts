import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient, json } from "../lib/client.ts";

interface Input {
  document: unknown;
}

/**
 * `POST /api/method/frappe.client.submit` — move a submittable document from
 * draft to submitted.
 *
 * ## Why this needs the WHOLE document, not just `doctype` + `name`
 *
 * Most transactional DocTypes in ERPNext — Sales Order, Purchase Order,
 * Sales Invoice, and most others whose list shows a Draft/Submitted/Cancelled
 * status — are "submittable": `docstatus` moves `0` (draft) → `1`
 * (submitted) → `2` (cancelled), and submitting is what makes the document
 * count toward accounting, stock or a workflow's own approval state.
 *
 * `frappe.client.submit(doc)` is bundled with the framework itself
 * (`frappe/client.py`, `develop` branch, fetched 2026-09-05) and its body is
 * exactly `doc = frappe.get_doc(doc); doc.submit()`. The trap here is
 * `frappe.get_doc` applied to a single dict, verified against
 * `frappe/model/document.py` the same day: it does **not** fetch anything —
 * it constructs a brand-new, in-memory document from whatever fields the dict
 * contains. Passing only `{"doctype": "...", "name": "..."}` would submit a
 * document Frappe never actually loaded, and it would fail on every mandatory
 * field the caller didn't happen to include.
 *
 * So this action asks for the full document — normally exactly what Get
 * Document just returned — and forwards it as-is. `Get Document → Submit
 * Document` is the intended pair.
 *
 * `idempotent: false`: a document that is already submitted cannot be
 * submitted again — Frappe raises a `DocstatusTransitionError` rather than
 * quietly no-op'ing, so a retry after a successful submit fails.
 */
const submitDocument: ActionDefinition<Input> = {
  key: "submit-document",
  type: "perform",
  title: "Submit Document",
  description:
    "Submit a draft document (Sales Order, Purchase Order, Sales Invoice, or any other " +
    "submittable DocType), moving it from Draft to Submitted. Pass the FULL document — the " +
    "output of Get Document — not just its doctype and name.",
  idempotent: false,
  params: [
    {
      key: "document",
      label: "Document",
      type: "json",
      required: true,
      hint: "The full document JSON, including `doctype` and `name` — typically the `document` " +
        "output of Get Document. A document already submitted, or missing mandatory fields, is " +
        "refused by ERPNext with its own validation error.",
    },
  ],
  output: [{ key: "document", type: "object", label: "The submitted document" }],

  async execute(input, ctx) {
    const doc = json(input.document, "Document");
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
      throw new Error("Document must be a JSON object.");
    }

    const result = await new ErpNextClient(ctx).method<Record<string, unknown>>(
      "frappe.client.submit",
      { method: "POST", body: { doc } },
    );
    return { document: result ?? {} };
  },
};

export default submitDocument;
