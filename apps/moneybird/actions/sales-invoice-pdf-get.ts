import type { ActionDefinition } from "@w6w/types";
import { MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import { administrationIdParam, idParam } from "../lib/params.ts";

interface Input {
  administrationId?: string;
  id: string;
  hideStationery?: boolean;
}

/**
 * `GET /:administration_id/sales_invoices/:id/download_pdf.json` — redirects
 * (`302`) to a pre-signed download URL, valid for only 30 seconds per the
 * vendor's own docs.
 *
 * **This action returns the download URL; it does not fetch the file's
 * bytes.** The `Location` Moneybird redirects to is a per-request signed link
 * on Moneybird's own storage backend, not `moneybird.com` itself, so it
 * cannot be a fixed `network.allow` entry — `ctx.fetch` is called with
 * `redirect: "manual"` and the `Location` header is returned as-is. Treat it
 * as a one-time link to hand to whatever step needs the actual bytes within
 * the next 30 seconds, not something to store.
 */
const salesInvoicePdfGet: ActionDefinition<Input> = {
  key: "sales-invoice-pdf-get",
  type: "read",
  resource: "sales_invoice",
  title: "Get Sales Invoice PDF URL",
  description: "Resolve a sales invoice's short-lived, pre-signed PDF download URL, without " +
    "fetching the file's bytes.",
  params: [
    administrationIdParam,
    idParam("Sales Invoice ID"),
    {
      key: "hideStationery",
      label: "Hide sender address and logo",
      type: "boolean",
      advanced: true,
    },
  ],
  output: [{ key: "downloadUrl", type: "string", label: "Pre-signed, short-lived download URL" }],

  async execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    const downloadUrl = await new MoneybirdClient(ctx, administrationId).redirectLocation(
      `/sales_invoices/${encodeURIComponent(input.id)}/download_pdf`,
      { query: { media: input.hideStationery ? "stationery" : undefined } },
    );
    return { downloadUrl };
  },
};

export default salesInvoicePdfGet;
