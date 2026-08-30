import type { ActionDefinition } from "@w6w/types";
import { compact, MauticClient } from "../lib/client.ts";

/**
 * `POST /segments/new` — verified against Mautic's REST API docs
 * (`segments.html`, "Create Segment"). Filter criteria are Mautic's own
 * structured `{glue, field, object, type, operator, properties}` shape and
 * are not reconstructed here — `filters` takes that array verbatim as JSON,
 * copied from the segment's own filter builder or a previous `segment-get`.
 * Omitting it creates an empty, manually-managed segment.
 */
const action: ActionDefinition = {
  key: "segment-create",
  type: "perform",
  resource: "segment",
  title: "Create a segment",
  description: "Create a new segment, optionally with filter criteria.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    { key: "publicName", label: "Public Name", type: "string", default: "" },
    { key: "description", label: "Description", type: "text", default: "" },
    { key: "isPublished", label: "Published", type: "boolean", default: true },
    { key: "isGlobal", label: "Global", type: "boolean", default: false },
    {
      key: "filters",
      label: "Filters (JSON)",
      type: "json",
      default: "",
      hint: "Array of Mautic filter criteria, e.g. " +
        '[{"glue":"and","field":"points","object":"lead","type":"number","operator":"gte",' +
        '"properties":{"filter":"100"}}].',
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    let filters: unknown;
    if (p.filters) {
      if (typeof p.filters === "string") {
        try {
          filters = JSON.parse(p.filters);
        } catch {
          throw new Error("`filters` is not valid JSON");
        }
      } else {
        filters = p.filters;
      }
    }

    const body = compact({
      name,
      publicName: p.publicName,
      description: p.description,
      isPublished: p.isPublished,
      isGlobal: p.isGlobal,
      filters,
    });

    ctx.log("info", "creating a Mautic segment", { name });

    const res = await new MauticClient(ctx).request<{ list: unknown }>("/segments/new", {
      method: "POST",
      body,
    });
    return res.list;
  },
};

export default action;
