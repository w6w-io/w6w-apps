import type { ActionDefinition } from "@w6w/types";
import { compact, ShippoClient } from "../lib/client.ts";
import type { Rate } from "../lib/client.ts";

/**
 * `POST /transactions` — **buy the label**.
 *
 * This is the action that spends money. It takes a rate `object_id` from
 * `shipment-create` (or `shipment-get`), purchases it, and returns a label
 * URL, a tracking number, and — for international shipments — a commercial
 * invoice. There is no undo: `refund-create` asks the carrier for the money
 * back, and the answer is not guaranteed or immediate.
 *
 * ## Buying the cheapest is a choice, and it is offered explicitly
 *
 * Most workflows want the lowest price, and hand-picking a rate id from an
 * array is awkward in a graph. So this accepts either a specific `rateId` or
 * **Buy Cheapest** (with the `shipmentId` it came from), which re-reads the
 * shipment's current rates and picks the lowest numerically — comparing them
 * as strings would put `"9.99"` above `"10.05"`.
 *
 * `maxPrice` is the guard for a workflow that buys automatically: a rate
 * above it is refused before the purchase call is made, which is the
 * difference between a bad day and a bad week.
 *
 * ## `async: false` is sent explicitly
 *
 * Shippo's own schema defaults `async` to `true`, which returns a `status:
 * "QUEUED"` transaction with no label yet. This action sends `false` so the
 * label URL and tracking number are available in the same response, unless
 * the caller opts into polling via `transaction-get`.
 *
 * ## Only rates less than 7 days old can be purchased
 *
 * Stated in Shippo's own schema — a rate quoted last week will be refused at
 * purchase time. Re-rate with `shipment-create` first if that has happened.
 */
const action: ActionDefinition = {
  key: "transaction-create",
  type: "perform",
  resource: "transaction",
  title: "Buy a label from a rate",
  description:
    "PURCHASES the label. Money moves and a tracking number is issued; refund-create is a " +
    "request to the carrier, not an undo.",
  idempotent: false,
  params: [
    {
      key: "rateId",
      label: "Rate ID",
      type: "string",
      default: "",
      hint: "From shipment-create/shipment-get. Leave blank to buy the cheapest — see below.",
    },
    {
      key: "shipmentId",
      label: "Shipment ID",
      type: "string",
      default: "",
      hint: "Required when Buy Cheapest is on, or when Maximum Price should be checked against " +
        "the shipment's current rates rather than trusted from Rate ID alone.",
    },
    {
      key: "buyCheapest",
      label: "Buy the Cheapest Rate",
      type: "boolean",
      default: false,
      hint: "Re-reads the shipment named by Shipment ID and picks the lowest price numerically. " +
        "Convenient, and not always right — the cheapest rate may be a five-day service on a " +
        "next-day order.",
    },
    {
      key: "maxPrice",
      label: "Maximum Price",
      type: "number",
      default: 0,
      hint: "Refuse to buy above this. Requires Shipment ID so the rate's current price can be " +
        "checked; 0 means no limit.",
    },
    {
      key: "labelFileType",
      label: "Label File Type",
      type: "select",
      default: "",
      advanced: true,
      hint: "Blank uses the format set in the Shippo dashboard.",
      options: [
        { value: "", label: "Account default" },
        { value: "PDF", label: "PDF" },
        { value: "PDF_4x6", label: "PDF 4x6" },
        { value: "PDF_4x8", label: "PDF 4x8" },
        { value: "PDF_A4", label: "PDF A4" },
        { value: "PDF_A5", label: "PDF A5" },
        { value: "PDF_A6", label: "PDF A6" },
        { value: "PNG", label: "PNG" },
        { value: "PNG_2.3x7.5", label: "PNG 2.3x7.5" },
        { value: "PDF_2.3x7.5", label: "PDF 2.3x7.5" },
        { value: "ZPLII", label: "ZPL II (thermal printers)" },
      ],
    },
    { key: "metadata", label: "Metadata", type: "string", default: "" },
  ],
  output: [
    { key: "object_id", type: "string", label: "Transaction ID" },
    { key: "status", type: "string", label: "WAITING · QUEUED · SUCCESS · ERROR · REFUNDED" },
    { key: "tracking_number", type: "string", label: "The carrier's tracking number" },
    { key: "label_url", type: "string", label: "The label file" },
    { key: "commercial_invoice_url", type: "string", label: "International shipments only" },
    { key: "tracking_url_provider", type: "string", label: "Carrier's own tracking page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipmentId = String(p.shipmentId ?? "").trim();
    let rateId = String(p.rateId ?? "").trim();
    const maxPrice = Number(p.maxPrice ?? 0);
    const client = new ShippoClient(ctx);

    // Resolve the rate first when buying by price, so the ceiling can be
    // enforced before any money moves.
    if (!rateId || p.buyCheapest === true || maxPrice > 0) {
      if (!shipmentId) {
        throw new Error(
          "`shipmentId` is required to buy the cheapest rate or to enforce Maximum Price",
        );
      }
      const shipment = await client.request<{ rates?: Rate[] }>(
        `/shipments/${encodeURIComponent(shipmentId)}`,
      );
      const rates = [...(shipment?.rates ?? [])].sort(
        (a, b) => Number(a?.amount ?? Infinity) - Number(b?.amount ?? Infinity),
      );
      if (rates.length === 0) throw new Error("this shipment has no rates to buy");

      const chosen = rateId ? rates.find((r) => r.object_id === rateId) : rates[0];
      if (!chosen) {
        throw new Error(`rate ${rateId} is not on this shipment — re-rate it and choose again`);
      }
      const price = Number(chosen.amount ?? Infinity);
      if (maxPrice > 0 && price > maxPrice) {
        throw new Error(
          `refusing to buy: the ${chosen.provider} ${
            chosen.servicelevel?.name ?? ""
          } rate is ${chosen.amount} ${chosen.currency ?? ""}, above the ${maxPrice} ceiling`,
        );
      }
      rateId = String(chosen.object_id ?? "");
    }
    if (!rateId) throw new Error("`rateId` is required");

    // Logged before the purchase: if the request dies mid-flight, this line is
    // the only record that money may have moved.
    ctx.log("info", "buying a Shippo label", { rateId, shipmentId: shipmentId || undefined });

    const transaction = await client.request("/transactions", {
      method: "POST",
      body: compact({
        rate: rateId,
        label_file_type: p.labelFileType,
        metadata: p.metadata,
        async: false,
      }),
    }) as { object_id?: string; status?: string; tracking_number?: string };

    ctx.log("info", "bought a Shippo label", {
      transactionId: transaction?.object_id,
      status: transaction?.status,
    });
    return transaction;
  },
};

export default action;
