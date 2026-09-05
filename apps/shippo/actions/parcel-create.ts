import type { ActionDefinition } from "@w6w/types";
import { compact, dimension, ShippoClient } from "../lib/client.ts";

/**
 * `POST /parcels` — describe a box once and reuse its `object_id` in every
 * shipment that ships in it, rather than repeating the dimensions inline.
 *
 * Shippo's own schema types `length`/`width`/`height`/`weight` as **strings**
 * ("up to six digits... four digits after the decimal separator"), so this
 * action stringifies whatever numeric value it is given rather than sending
 * a JSON number.
 */
const action: ActionDefinition = {
  key: "parcel-create",
  type: "perform",
  resource: "parcel",
  title: "Create a parcel",
  description: "Describe a box's dimensions and weight once, and reuse its id across shipments.",
  idempotent: false,
  params: [
    { key: "length", label: "Length", type: "number", required: true, default: "" },
    { key: "width", label: "Width", type: "number", required: true, default: "" },
    { key: "height", label: "Height", type: "number", required: true, default: "" },
    {
      key: "distanceUnit",
      label: "Distance unit",
      type: "select",
      required: true,
      default: "in",
      options: [
        { value: "cm", label: "Centimeters" },
        { value: "in", label: "Inches" },
        { value: "ft", label: "Feet" },
        { value: "m", label: "Meters" },
        { value: "mm", label: "Millimeters" },
        { value: "yd", label: "Yards" },
      ],
    },
    { key: "weight", label: "Weight", type: "number", required: true, default: "" },
    {
      key: "massUnit",
      label: "Weight unit",
      type: "select",
      required: true,
      default: "lb",
      options: [
        { value: "g", label: "Grams" },
        { value: "kg", label: "Kilograms" },
        { value: "lb", label: "Pounds" },
        { value: "oz", label: "Ounces" },
      ],
    },
    { key: "metadata", label: "Metadata", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "object_id", type: "string", label: "Parcel ID — pass it to shipment-create by id" },
    { key: "test", type: "boolean", label: "Created with a test token" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    for (const field of ["length", "width", "height", "weight"]) {
      if (p[field] === undefined || p[field] === null || p[field] === "") {
        throw new Error(`\`${field}\` is required`);
      }
    }

    const parcel = await new ShippoClient(ctx).request("/parcels", {
      method: "POST",
      body: compact({
        length: dimension(p.length),
        width: dimension(p.width),
        height: dimension(p.height),
        distance_unit: p.distanceUnit,
        weight: dimension(p.weight),
        mass_unit: p.massUnit,
        metadata: p.metadata,
      }),
    }) as { object_id?: string };

    ctx.log("info", "created a Shippo parcel", { parcelId: parcel?.object_id });
    return parcel;
  },
};

export default action;
