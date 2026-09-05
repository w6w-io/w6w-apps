import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { transactionIdParam } from "../lib/params.ts";

/**
 * `PATCH /transaction/{transactionId}` — update a transaction's note and/or
 * category. `operationId: updateTransaction`.
 *
 * Both `note` and `categoryId` are **required keys in the request body**
 * (verified in the OpenAPI document's `requestBody.required`), but each
 * follows an omit/null/value tri-state per the vendor's own field
 * descriptions: *"Omit field to keep current, send null to clear, send
 * ID/text to set."* Since this app cannot distinguish "the caller left this
 * blank" from "the caller wants to omit it" once both params exist on the
 * form, both are always sent — leave a field blank to clear it, rather than
 * to leave it unchanged.
 */
interface Input {
  transactionId: string;
  note?: string;
  categoryId?: string;
}

const transactionUpdate: ActionDefinition<Input> = {
  key: "transaction-update",
  type: "perform",
  resource: "transaction",
  title: "Update Transaction Metadata",
  description: "Set or clear a transaction's note and/or custom expense category.",
  idempotent: true,
  params: [
    transactionIdParam,
    {
      key: "note",
      label: "Note",
      type: "text",
      hint:
        "Leave blank to clear the existing note. This field is always sent — there is no way to leave the note untouched from this form.",
    },
    {
      key: "categoryId",
      label: "Category ID",
      type: "string",
      hint:
        "A category UUID from category-list. Leave blank to clear the existing category. Always sent, same as Note.",
    },
  ],
  output: [{ key: "transaction", type: "object", label: "Updated transaction" }],

  async execute(input, ctx) {
    const transaction = await new MercuryClient(ctx).json(
      `/transaction/${encodeURIComponent(input.transactionId)}`,
      {
        method: "PATCH",
        body: {
          note: input.note || null,
          categoryId: input.categoryId || null,
        },
      },
    );
    return { transaction };
  },
};

export default transactionUpdate;
