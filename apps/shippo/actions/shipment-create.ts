import type { ActionDefinition } from "@w6w/types";
import { addressRef, compact, csv, ShippoClient, sortRates } from "../lib/client.ts";
import type { Rate } from "../lib/client.ts";

/**
 * `POST /shipments` — describe two addresses and one or more parcels, get
 * back every carrier's price. **This buys nothing.**
 *
 * ## Rating and buying stay two steps, on purpose
 *
 * Creating a shipment only rates it — no label exists, no tracking number has
 * been issued, and nothing is owed. `transaction-create` is the step that
 * spends money, using one of the `object_id`s in this action's `rates` array.
 * Keeping them separate means a workflow that only wants a price can never
 * accidentally buy a label.
 *
 * ## `async: false` is sent explicitly
 *
 * Left to its own defaults, Shippo can return a shipment with `status:
 * "QUEUED"` and an **empty** `rates` array, computing rates after the
 * response — Shippo's own docs pass `"async": false` in every example to
 * avoid this. This action does the same unless the caller opts into polling
 * (`shipment-get` reads the eventual result).
 *
 * ## Rates come back unordered, and `amount` is a string
 *
 * Sorting them as strings puts `"9.99"` above `"10.05"`. This action returns
 * them sorted numerically and surfaces `cheapestRate` separately, since
 * picking the cheapest is what most workflows do next.
 */
const action: ActionDefinition = {
  key: "shipment-create",
  type: "perform",
  resource: "shipment",
  title: "Create a shipment and get rates",
  description:
    "Describe a parcel and get every carrier's price for it. This BUYS NOTHING — no label, no " +
    "tracking number, nothing owed. `transaction-create` is the step that spends money.",
  idempotent: false,
  params: [
    {
      key: "addressTo",
      label: "To Address",
      type: "json",
      required: true,
      default: "",
      hint: 'Inline — {"name":"…","street1":"…","city":"…","state":"…","zip":"…","country":"US"} ' +
        "— or an existing address `object_id` as a plain string.",
    },
    {
      key: "addressFrom",
      label: "From Address",
      type: "json",
      required: true,
      default: "",
      hint: "Inline or by id. A warehouse shipping all day should create this once and pass the " +
        "id.",
    },
    {
      key: "parcel",
      label: "Parcel",
      type: "json",
      required: true,
      default: "",
      hint: 'Inline — {"length":"10","width":"8","height":"4","distance_unit":"in",' +
        '"weight":"16","mass_unit":"oz"} — or an existing parcel `object_id`.',
    },
    {
      key: "async",
      label: "Rate asynchronously",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Off by default so rates come back in this same call. On defers rating; poll " +
        "shipment-get until `status` is no longer QUEUED.",
    },
    {
      key: "carrierAccounts",
      label: "Carrier Accounts",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated carrier account ids to rate against. Blank rates against every " +
        "active carrier account on the connection.",
    },
    {
      key: "customsDeclaration",
      label: "Customs Declaration",
      type: "json",
      default: "",
      advanced: true,
      hint: "Required for anything crossing a border, inline or by `object_id`. Without it an " +
        "international shipment rates and then fails at purchase.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "string",
      default: "",
      hint: "Your own identifier — an order number. It comes back on the shipment and on " +
        "webhooks, and is the only thing tying a label to whatever caused it.",
    },
  ],
  output: [
    { key: "object_id", type: "string", label: "Shipment ID — pass it to transaction-create" },
    { key: "status", type: "string", label: "WAITING · QUEUED · SUCCESS · ERROR" },
    { key: "rates", type: "array", label: "Every carrier's price, cheapest first" },
    { key: "cheapestRate", type: "object", label: "The lowest-priced rate, compared numerically" },
    { key: "rateCount", type: "number", label: "How many carriers quoted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const addressTo = addressRef(p.addressTo, "addressTo");
    const addressFrom = addressRef(p.addressFrom, "addressFrom");
    const parcel = addressRef(p.parcel, "parcel");
    if (!addressTo) throw new Error("`addressTo` is required");
    if (!addressFrom) throw new Error("`addressFrom` is required");
    if (!parcel) throw new Error("`parcel` is required");

    const shipment = await new ShippoClient(ctx).request<
      { object_id?: string; status?: string; rates?: Rate[] }
    >("/shipments", {
      method: "POST",
      body: compact({
        address_to: addressTo,
        address_from: addressFrom,
        parcels: [parcel],
        async: p.async ?? false,
        carrier_accounts: csv(p.carrierAccounts),
        customs_declaration: addressRef(p.customsDeclaration, "customsDeclaration"),
        metadata: p.metadata,
      }),
    });

    const rates = sortRates(shipment?.rates ?? []);
    if (rates.length === 0 && shipment?.status !== "QUEUED") {
      // Rating silently returning nothing is a real outcome — no carrier
      // account can serve the route — and it is better said than discovered.
      ctx.log("warn", "Shippo returned no rates for this shipment", {
        shipmentId: shipment?.object_id,
        status: shipment?.status,
      });
    }

    ctx.log("info", "created a Shippo shipment", {
      shipmentId: shipment?.object_id,
      status: shipment?.status,
      rateCount: rates.length,
    });
    return { ...shipment, rates, cheapestRate: rates[0], rateCount: rates.length };
  },
};

export default action;
