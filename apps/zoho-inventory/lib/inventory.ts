/**
 * Shared helpers for Zoho Inventory's resource endpoints
 * (`/inventory/v1/{resource}...`). Contacts, Items, Locations and Sales Orders
 * all share the same `{code, message, page_context?, <resourceKey>}` envelope
 * and the same `organization_id`-on-every-call requirement, so the request
 * assembly lives here once and the per-resource action files
 * (`actions/contact-*.ts`, `actions/item-*.ts`, ...) stay thin wrappers that
 * only know their own path and resource key.
 */
import type { HookContext } from "@w6w/types";
import {
  type InventoryEnvelope,
  organizationIdFrom,
  type PageContext,
  parseFields,
  unwrapResource,
  ZohoInventoryClient,
} from "./client.ts";

export interface InventoryListResult<T> {
  data: T[];
  pageContext?: PageContext;
}

/**
 * Pagination only — `page`/`per_page` are the two query parameters Zoho
 * Inventory documents for list endpoints, and they default to 200 records per
 * page. Pass-through filters (`contact_type`, `search_text`, ...) are
 * deliberately not exposed; see the README.
 */
export interface InventoryListInput {
  organizationId?: string;
  page?: number;
  per_page?: number;
}

export async function inventoryList<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: InventoryListInput,
): Promise<InventoryListResult<T>> {
  const body = await new ZohoInventoryClient(ctx).request<InventoryEnvelope>(path, {
    query: {
      organization_id: organizationIdFrom(input, ctx),
      page: input.page,
      per_page: input.per_page,
    },
  });
  return { data: unwrapResource<T[]>(body, resourceKey), pageContext: body.page_context };
}

export interface InventoryGetInput {
  recordId: string;
  organizationId?: string;
}

export async function inventoryGet<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: InventoryGetInput,
): Promise<T> {
  const body = await new ZohoInventoryClient(ctx).request<InventoryEnvelope>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    { query: { organization_id: organizationIdFrom(input, ctx) } },
  );
  return unwrapResource<T>(body, resourceKey);
}

export interface InventoryCreateInput {
  fields: unknown;
  organizationId?: string;
}

export async function inventoryCreate<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: InventoryCreateInput,
): Promise<T> {
  const body = await new ZohoInventoryClient(ctx).request<InventoryEnvelope>(path, {
    method: "POST",
    query: { organization_id: organizationIdFrom(input, ctx) },
    body: parseFields(input.fields),
  });
  return unwrapResource<T>(body, resourceKey);
}

export interface InventoryUpdateInput {
  recordId: string;
  fields: unknown;
  organizationId?: string;
}

export async function inventoryUpdate<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: InventoryUpdateInput,
): Promise<T> {
  const body = await new ZohoInventoryClient(ctx).request<InventoryEnvelope>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    {
      method: "PUT",
      query: { organization_id: organizationIdFrom(input, ctx) },
      body: parseFields(input.fields),
    },
  );
  return unwrapResource<T>(body, resourceKey);
}

export interface InventoryDeleteInput {
  recordId: string;
  organizationId?: string;
}

export interface InventoryDeleteResult {
  code: number;
  message: string;
}

/**
 * `DELETE /{resource}/{id}` answers with the bare envelope — no resource key —
 * so this returns `{code, message}` rather than unwrapping anything.
 */
export function inventoryDelete(
  ctx: HookContext,
  path: string,
  input: InventoryDeleteInput,
): Promise<InventoryDeleteResult> {
  return new ZohoInventoryClient(ctx).request<InventoryEnvelope>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    { method: "DELETE", query: { organization_id: organizationIdFrom(input, ctx) } },
  );
}
