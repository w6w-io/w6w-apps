import type { ActionDefinition } from "@w6w/types";
import { compact, json, OnfleetClient } from "../lib/client.ts";

/**
 * `POST /destinations` — create a reusable address.
 *
 * Either give a full `address` object, or set `address.unparsed` to a single
 * comma-separated string and let Onfleet geocode it — in some countries a
 * bare `postalCode` plus street is enough (`"543 Howard St, 94105, USA"`).
 * If `location` (`[longitude, latitude]`) is omitted, Onfleet geocodes it
 * from the address; providing both `location` and `address.unparsed`
 * together is rejected.
 */
const action: ActionDefinition = {
  key: "destination-create",
  type: "perform",
  resource: "destination",
  title: "Create destination",
  description: "Create a reusable address, geocoded by Onfleet unless coordinates are given.",
  idempotent: false,
  params: [
    {
      key: "address",
      label: "Address",
      type: "json",
      required: true,
      default: "",
      hint: 'Full: {"number":"543","street":"Howard St","city":"San Francisco","state":"CA",' +
        '"country":"USA"}. Or unparsed: {"unparsed":"543 Howard St, San Francisco, CA"}.',
    },
    {
      key: "location",
      label: "Location [longitude, latitude]",
      type: "json",
      default: "",
      advanced: true,
      hint: "Optional. Skips geocoding. Cannot be combined with `address.unparsed`.",
    },
    { key: "notes", label: "Notes", type: "text", default: "" },
    {
      key: "language",
      label: "Language",
      type: "string",
      default: "",
      advanced: true,
      hint: "ISO 3166-1 two-letter country code, for geocoding language.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Destination ID" },
    { key: "location", type: "array", label: "Location" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const address = json(p.address, "address");
    if (!address) throw new Error("`address` is required");

    const destination = await new OnfleetClient(ctx).request<{ id?: string }>("/destinations", {
      method: "POST",
      body: compact({
        address,
        location: json(p.location, "location"),
        notes: p.notes,
        options: p.language ? { language: p.language } : undefined,
      }),
    });

    ctx.log("info", "created an Onfleet destination", { destinationId: destination?.id });
    return destination;
  },
};

export default action;
