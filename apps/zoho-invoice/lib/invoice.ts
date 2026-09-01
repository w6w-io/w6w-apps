/**
 * Shared helpers for Zoho Invoice's resource endpoints (`/invoice/v3/{resource}
 * ...`). Contacts, Items, Invoices and Estimates all share the same
 * `{code, message, page_context?, <resourceKey>}` envelope and the same
 * organization-id-on-every-call requirement, so the request assembly lives
 * here once and the per-resource action files (`actions/contact-*.ts`,
 * `actions/item-*.ts`, ...) stay thin wrappers that only know their own path
 * and resource key.
 */
import type { HookContext } from "@w6w/types";
import {
  type InvoiceEnvelope,
  organizationIdFrom,
  type PageContext,
  parseFields,
  unwrapResource,
  ZohoInvoiceClient,
} from "./client.ts";

export interface InvoiceListResult<T> {
  data: T[];
  pageContext?: PageContext;
}

export interface InvoiceListInput {
  organizationId?: string;
  page?: number;
  per_page?: number;
  sort_column?: string;
  sort_order?: "ascending" | "descending";
}

export async function invoiceList<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: InvoiceListInput,
  extraQuery: Record<string, string | number | boolean | undefined | null> = {},
): Promise<InvoiceListResult<T>> {
  const organizationId = organizationIdFrom(input, ctx);
  const body = await new ZohoInvoiceClient(ctx).request<InvoiceEnvelope>(path, {
    organizationId,
    query: {
      page: input.page,
      per_page: input.per_page,
      sort_column: input.sort_column,
      sort_order: input.sort_order,
      ...extraQuery,
    },
  });
  return { data: unwrapResource<T[]>(body, resourceKey), pageContext: body.page_context };
}

export interface InvoiceGetInput {
  recordId: string;
  organizationId?: string;
}

export async function invoiceGet<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: InvoiceGetInput,
): Promise<T> {
  const organizationId = organizationIdFrom(input, ctx);
  const body = await new ZohoInvoiceClient(ctx).request<InvoiceEnvelope>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    { organizationId },
  );
  return unwrapResource<T>(body, resourceKey);
}

export interface InvoiceCreateInput {
  fields: unknown;
  organizationId?: string;
}

export async function invoiceCreate<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: InvoiceCreateInput,
): Promise<T> {
  const organizationId = organizationIdFrom(input, ctx);
  const body = await new ZohoInvoiceClient(ctx).request<InvoiceEnvelope>(path, {
    method: "POST",
    organizationId,
    body: parseFields(input.fields),
  });
  return unwrapResource<T>(body, resourceKey);
}

export interface InvoiceUpdateInput {
  recordId: string;
  fields: unknown;
  organizationId?: string;
}

export async function invoiceUpdate<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: InvoiceUpdateInput,
): Promise<T> {
  const organizationId = organizationIdFrom(input, ctx);
  const body = await new ZohoInvoiceClient(ctx).request<InvoiceEnvelope>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    { method: "PUT", organizationId, body: parseFields(input.fields) },
  );
  return unwrapResource<T>(body, resourceKey);
}

export interface InvoiceDeleteInput {
  recordId: string;
  organizationId?: string;
}

export interface InvoiceStatusResult {
  code: number;
  message: string;
}

export function invoiceDelete(
  ctx: HookContext,
  path: string,
  input: InvoiceDeleteInput,
): Promise<InvoiceStatusResult> {
  const organizationId = organizationIdFrom(input, ctx);
  return new ZohoInvoiceClient(ctx).request<InvoiceEnvelope>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    { method: "DELETE", organizationId },
  );
}

/**
 * A status-transition or notification action with no request body of its own
 * — mark-sent, void, and similar `POST /{resource}/{id}/{verb}` endpoints
 * that only need the record id and the organization.
 */
export function invoiceStatusAction(
  ctx: HookContext,
  path: string,
  input: { recordId: string; organizationId?: string },
): Promise<InvoiceStatusResult> {
  const organizationId = organizationIdFrom(input, ctx);
  return new ZohoInvoiceClient(ctx).request<InvoiceEnvelope>(
    path.replace("{id}", encodeURIComponent(input.recordId)),
    { method: "POST", organizationId },
  );
}
