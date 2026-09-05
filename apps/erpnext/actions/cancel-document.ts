import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient } from "../lib/client.ts";
import { DOCTYPE_PARAM, NAME_PARAM } from "../lib/params.ts";

interface Input {
  doctype: string;
  name: string;
}

/**
 * `POST /api/method/frappe.client.cancel` — cancel a submitted document.
 *
 * Unlike Submit Document, `frappe.client.cancel(doctype, name)` takes the
 * doctype and name as two SEPARATE arguments rather than a document dict
 * (`frappe/client.py`, `develop` branch, fetched 2026-09-05:
 * `wrapper = frappe.get_doc(doctype, name); wrapper.cancel()`). That two-
 * positional-argument form of `frappe.get_doc` genuinely fetches the current
 * document from the database first (verified against
 * `frappe/model/document.py` the same day), so there is no "stale copy"
 * problem here the way there would be for Submit — this action only needs
 * the two identifiers.
 *
 * `idempotent: false`: cancelling an already-cancelled document is refused,
 * not a silent success, so a retry after it worked fails.
 */
const cancelDocument: ActionDefinition<Input> = {
  key: "cancel-document",
  type: "perform",
  title: "Cancel Document",
  description: "Cancel a submitted document (Sales Order, Purchase Order, Sales Invoice, or any " +
    "other submittable DocType). Only a submitted document can be cancelled.",
  idempotent: false,
  params: [DOCTYPE_PARAM, NAME_PARAM],
  output: [{ key: "document", type: "object", label: "The cancelled document" }],

  async execute(input, ctx) {
    const result = await new ErpNextClient(ctx).method<Record<string, unknown>>(
      "frappe.client.cancel",
      { method: "POST", body: { doctype: input.doctype, name: input.name } },
    );
    return { document: result ?? {} };
  },
};

export default cancelDocument;
