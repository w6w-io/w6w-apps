import type { ActionDefinition } from "@w6w/types";
import { ShippoClient } from "../lib/client.ts";

/**
 * `GET /addresses/{id}/validate` — re-run validation on an address that was
 * created without `validate: true`, or refresh a stale result.
 *
 * Returns the full Address object with `validation_results` populated —
 * `is_valid` plus any `messages` describing what was found (a corrected
 * apartment number, an unrecognized street). This is read-only and never
 * mutates the stored address.
 */
const action: ActionDefinition = {
  key: "address-validate",
  type: "read",
  resource: "address",
  title: "Validate an address",
  description:
    "Check whether a previously created address has every field a carrier needs, and surface " +
    "any corrections Shippo found.",
  params: [
    {
      key: "addressId",
      label: "Address ID",
      type: "string",
      required: true,
      default: "",
      hint: "The `object_id` from address-create.",
    },
  ],
  output: [
    { key: "object_id", type: "string", label: "Address ID" },
    { key: "is_complete", type: "boolean", label: "Has every field required to purchase a label" },
    { key: "validation_results", type: "object", label: "`is_valid` plus any correction messages" },
  ],

  async execute(input, ctx) {
    const { addressId } = input as { addressId?: string };
    if (!addressId) throw new Error("`addressId` is required");

    const address = await new ShippoClient(ctx).request(
      `/addresses/${encodeURIComponent(addressId)}/validate`,
    ) as { object_id?: string; validation_results?: { is_valid?: boolean } };

    ctx.log("info", "validated a Shippo address", {
      addressId: address?.object_id,
      isValid: address?.validation_results?.is_valid,
    });
    return address;
  },
};

export default action;
