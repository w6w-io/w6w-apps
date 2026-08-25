import type { ActionDefinition } from "@w6w/types";
import { DEFAULT_PAGE_SIZE, ShipStationClient } from "../lib/client.ts";

/** `GET /v2/labels` — list purchased labels with optional filters. */
const action: ActionDefinition = {
  key: "label-list",
  type: "search",
  resource: "label",
  title: "List Labels",
  description: "List purchased labels with optional filters. Paged, most-recently-created first.",
  params: [
    {
      key: "labelStatus",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { label: "Any", value: "" },
        { label: "Processing", value: "processing" },
        { label: "Completed", value: "completed" },
        { label: "Error", value: "error" },
        { label: "Voided", value: "voided" },
      ],
    },
    { key: "carrierId", label: "Carrier ID", type: "string", default: "" },
    { key: "serviceCode", label: "Service Code", type: "string", default: "" },
    { key: "trackingNumber", label: "Tracking Number", type: "string", default: "" },
    { key: "batchId", label: "Batch ID", type: "string", default: "", advanced: true },
    { key: "warehouseId", label: "Warehouse ID", type: "string", default: "", advanced: true },
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
    { key: "labels", type: "array", label: "Labels on this page" },
    { key: "total", type: "number", label: "Total matching labels across all pages" },
    { key: "page", type: "number", label: "Current page" },
    { key: "pages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const result = await new ShipStationClient(ctx).request<{
      labels?: unknown[];
      total?: number;
      page?: number;
      pages?: number;
    }>("/labels", {
      query: {
        label_status: (p.labelStatus as string) || undefined,
        carrier_id: (p.carrierId as string) || undefined,
        service_code: (p.serviceCode as string) || undefined,
        tracking_number: (p.trackingNumber as string) || undefined,
        batch_id: (p.batchId as string) || undefined,
        warehouse_id: (p.warehouseId as string) || undefined,
        created_at_start: (p.createdAtStart as string) || undefined,
        created_at_end: (p.createdAtEnd as string) || undefined,
        page: (p.page as number) || undefined,
        page_size: (p.pageSize as number) || undefined,
      },
    });

    return {
      labels: result?.labels ?? [],
      total: result?.total ?? 0,
      page: result?.page ?? 1,
      pages: result?.pages ?? 0,
    };
  },
};

export default action;
