import type { ActionDefinition } from "@w6w/types";
import { compact, ShippoClient } from "../lib/client.ts";

/**
 * `POST /addresses` — store an address and, optionally, validate it in the
 * same call.
 *
 * ## `validate: true` runs validation synchronously
 *
 * Passing `validate` triggers Shippo's carrier-agnostic address check as part
 * of creation, and the response's `validation_results.is_valid` /
 * `validation_results.messages` report what was found — a corrected
 * apartment number, an unrecognized street, and so on. Catching this before a
 * shipment is created is a lot cheaper than a returned parcel.
 *
 * Once created, an address is used elsewhere by its `object_id` rather than
 * being sent inline again — a warehouse that ships all day should create its
 * origin address once and reuse the id.
 */
const action: ActionDefinition = {
  key: "address-create",
  type: "perform",
  resource: "address",
  title: "Create an address",
  description:
    "Store an address, optionally validating it in the same call so a bad street or apartment " +
    "number is caught before a label is bought rather than after a parcel comes back.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Required to purchase a label.",
    },
    { key: "company", label: "Company", type: "string", default: "", advanced: true },
    {
      key: "street1",
      label: "Street 1",
      type: "string",
      default: "",
      hint: "Required to purchase a label.",
    },
    { key: "street2", label: "Street 2", type: "string", default: "", advanced: true },
    {
      key: "city",
      label: "City",
      type: "string",
      default: "",
      hint: "Required to purchase a label.",
    },
    {
      key: "state",
      label: "State / Province",
      type: "string",
      default: "",
      hint: "Required for shipments from/to the US, AU and CA.",
    },
    { key: "zip", label: "ZIP / Postal Code", type: "string", default: "" },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: true,
      hint: "ISO 3166-1 alpha-2 code, e.g. US, DE. Always required.",
    },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      default: "",
      hint: "FedEx requires it; USPS requires it at purchase time.",
    },
    { key: "email", label: "Email", type: "string", default: "" },
    {
      key: "isResidential",
      label: "Residential address",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "validate",
      label: "Validate now",
      type: "boolean",
      default: false,
      hint: "Runs Shippo's address validation as part of creation; check " +
        "`validation_results.is_valid` in the response.",
    },
    { key: "metadata", label: "Metadata", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "object_id", type: "string", label: "Address ID — pass it to shipment-create by id" },
    { key: "is_complete", type: "boolean", label: "Has every field required to purchase a label" },
    { key: "validation_results", type: "object", label: "Present only when `validate` was set" },
    { key: "test", type: "boolean", label: "Created with a test token" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.country) throw new Error("`country` is required");

    const address = await new ShippoClient(ctx).request("/addresses", {
      method: "POST",
      body: compact({
        name: p.name,
        company: p.company,
        street1: p.street1,
        street2: p.street2,
        city: p.city,
        state: p.state,
        zip: p.zip,
        country: p.country,
        phone: p.phone,
        email: p.email,
        is_residential: p.isResidential,
        validate: p.validate,
        metadata: p.metadata,
      }),
    }) as { object_id?: string; is_complete?: boolean };

    ctx.log("info", "created a Shippo address", { addressId: address?.object_id });
    return address;
  },
};

export default action;
