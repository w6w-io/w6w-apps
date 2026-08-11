import type { ActionDefinition } from "@w6w/types";
import { PaddleClient } from "../lib/client.ts";

/**
 * `GET /transactions/{transaction_id}/invoice` — a link to the invoice PDF.
 *
 * ## It returns a URL, not a PDF, and the URL expires in an hour
 *
 * The response is `{ data: { url } }`. A workflow that stores that URL and
 * mails it out the next morning sends a dead link — the download has to happen
 * inside the hour. This is stated in the description as well as here because it
 * is the single most likely way to misuse this action.
 *
 * ## Not every transaction has one
 *
 * Invoice PDFs exist for `completed` transactions (both collection modes) and
 * for `billed` manually-collected ones. Zero-value transactions never have one.
 * Anything else returns a 4xx, which the client surfaces with Paddle's own
 * `detail` text.
 */
interface Input {
  transactionId: string;
  disposition?: string;
}

const transactionInvoice: ActionDefinition<Input> = {
  key: "transaction-invoice",
  type: "read",
  resource: "transaction",
  title: "Get Transaction Invoice PDF",
  description:
    "Get a link to a transaction's invoice PDF. The link expires after one hour, so download it " +
    "in the same run.",
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      validation: { pattern: "^txn_[a-z0-9]{26}$" },
      hint:
        "Available for completed transactions, and for billed manually-collected ones. Never for " +
        "zero-value transactions.",
    },
    {
      key: "disposition",
      label: "Disposition",
      type: "select",
      options: [
        { value: "attachment", label: "Attachment — browsers download the PDF (default)" },
        { value: "inline", label: "Inline — browsers open the PDF in the tab" },
      ],
    },
  ],
  output: [{ key: "data", type: "object", label: "`{ url }` — expires one hour after issue" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(
      `/transactions/${encodeURIComponent(input.transactionId)}/invoice`,
      { query: { disposition: input.disposition } },
    );
  },
};

export default transactionInvoice;
