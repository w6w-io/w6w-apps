import type { ActionDefinition } from "@w6w/types";
import { DEFAULT_PAGE_SIZE, ShipStationClient } from "../lib/client.ts";

/**
 * `GET /v2/shipments` — list shipments (the V1/UI "orders") with optional filters.
 *
 * `batchId` is special: per `docs.shipstation.com/list-shipments`, filtering by batch
 * makes ShipStation **ignore every other filter** (`shipmentStatus`, the date ranges,
 * `tag`) — it assumes you're opening a batch to see its queue, not searching. Setting
 * both a batch and another filter silently drops the other filter rather than
 * erroring, which is exactly the kind of thing worth a code comment.
 */
const action: ActionDefinition = {
  key: "shipment-list",
  type: "search",
  resource: "shipment",
  title: "List Shipments",
  description: "List shipments with optional filters. Paged, most-recently-modified first.",
  params: [
    {
      key: "shipmentStatus",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { label: "Any", value: "" },
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Label Purchased", value: "label_purchased" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
    { key: "tag", label: "Tag", type: "string", default: "" },
    {
      key: "batchId",
      label: "Batch ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Filtering by batch makes ShipStation ignore every other filter below.",
    },
    {
      key: "modifiedAtStart",
      label: "Modified After",
      type: "datetime",
      default: "",
      advanced: true,
    },
    {
      key: "modifiedAtEnd",
      label: "Modified Before",
      type: "datetime",
      default: "",
      advanced: true,
    },
    {
      key: "createdAtStart",
      label: "Created After",
      type: "datetime",
      default: "",
      advanced: true,
    },
    { key: "createdAtEnd", label: "Created Before", type: "datetime", default: "", advanced: true },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page Size", type: "number", default: DEFAULT_PAGE_SIZE },
  ],
  output: [
    { key: "shipments", type: "array", label: "Shipments on this page" },
    { key: "total", type: "number", label: "Total matching shipments across all pages" },
    { key: "page", type: "number", label: "Current page" },
    { key: "pages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const result = await new ShipStationClient(ctx).request<{
      shipments?: unknown[];
      total?: number;
      page?: number;
      pages?: number;
    }>("/shipments", {
      query: {
        shipment_status: (p.shipmentStatus as string) || undefined,
        tag: (p.tag as string) || undefined,
        batch_id: (p.batchId as string) || undefined,
        modified_at_start: (p.modifiedAtStart as string) || undefined,
        modified_at_end: (p.modifiedAtEnd as string) || undefined,
        created_at_start: (p.createdAtStart as string) || undefined,
        created_at_end: (p.createdAtEnd as string) || undefined,
        page: (p.page as number) || undefined,
        page_size: (p.pageSize as number) || undefined,
      },
    });

    return {
      shipments: result?.shipments ?? [],
      total: result?.total ?? 0,
      page: result?.page ?? 1,
      pages: result?.pages ?? 0,
    };
  },
};

export default action;
