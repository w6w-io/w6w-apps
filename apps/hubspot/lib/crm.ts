/**
 * Shared helpers for HubSpot CRM v3 object endpoints.
 * All four "standard" objects (contacts, companies, deals, tickets) share the
 * same request/response shape at `/crm/v3/objects/{objectType}/...`, so we
 * factor the payload assembly here and let per-resource action files stay
 * thin wrappers.
 */
import type { HookContext } from "@w6w/types";
import { HubSpotClient, type HubSpotListResponse, type HubSpotObject } from "./client.ts";

export type CrmObjectType = "contacts" | "companies" | "deals" | "tickets";

export interface CrmListInput {
  limit?: number;
  after?: string;
  properties?: string | string[];
  propertiesWithHistory?: string | string[];
  associations?: string | string[];
  archived?: boolean;
}

/**
 * List objects with cursor pagination. Mirrors HubSpot's response verbatim —
 * callers pull `results` + `paging.next.after`.
 */
export async function crmList(
  ctx: HookContext,
  objectType: CrmObjectType,
  input: CrmListInput,
): Promise<HubSpotListResponse<HubSpotObject>> {
  const client = new HubSpotClient(ctx);
  return client.request<HubSpotListResponse<HubSpotObject>>(
    `/crm/v3/objects/${objectType}`,
    {
      query: {
        limit: input.limit ?? 100,
        after: input.after,
        properties: normalizeCsv(input.properties),
        propertiesWithHistory: normalizeCsv(input.propertiesWithHistory),
        associations: normalizeCsv(input.associations),
        archived: input.archived,
      },
    },
  );
}

export interface CrmGetInput {
  id: string;
  properties?: string | string[];
  propertiesWithHistory?: string | string[];
  associations?: string | string[];
  archived?: boolean;
  idProperty?: string;
}

export async function crmGet(
  ctx: HookContext,
  objectType: CrmObjectType,
  input: CrmGetInput,
): Promise<HubSpotObject> {
  const client = new HubSpotClient(ctx);
  return client.request<HubSpotObject>(
    `/crm/v3/objects/${objectType}/${encodeURIComponent(input.id)}`,
    {
      query: {
        properties: normalizeCsv(input.properties),
        propertiesWithHistory: normalizeCsv(input.propertiesWithHistory),
        associations: normalizeCsv(input.associations),
        archived: input.archived,
        idProperty: input.idProperty,
      },
    },
  );
}

export interface CrmCreateInput {
  properties: Record<string, unknown>;
  associations?: Array<{
    to: { id: string };
    types: Array<{ associationCategory: string; associationTypeId: number }>;
  }>;
}

export async function crmCreate(
  ctx: HookContext,
  objectType: CrmObjectType,
  input: CrmCreateInput,
): Promise<HubSpotObject> {
  const client = new HubSpotClient(ctx);
  return client.request<HubSpotObject>(`/crm/v3/objects/${objectType}`, {
    method: "POST",
    body: {
      properties: coerceProperties(input.properties),
      ...(input.associations ? { associations: input.associations } : {}),
    },
  });
}

export interface CrmUpdateInput {
  id: string;
  properties: Record<string, unknown>;
  idProperty?: string;
}

export async function crmUpdate(
  ctx: HookContext,
  objectType: CrmObjectType,
  input: CrmUpdateInput,
): Promise<HubSpotObject> {
  const client = new HubSpotClient(ctx);
  const path = `/crm/v3/objects/${objectType}/${encodeURIComponent(input.id)}`;
  return client.request<HubSpotObject>(path, {
    method: "PATCH",
    query: input.idProperty ? { idProperty: input.idProperty } : undefined,
    body: { properties: coerceProperties(input.properties) },
  });
}

export interface CrmDeleteInput {
  id: string;
}

/**
 * HubSpot returns 204 on delete. We synthesize a small confirmation body so
 * callers get a truthy result. Follows the same pattern the n8n node uses.
 */
export async function crmDelete(
  ctx: HookContext,
  objectType: CrmObjectType,
  input: CrmDeleteInput,
): Promise<{ id: string; deleted: true }> {
  const client = new HubSpotClient(ctx);
  await client.request<void>(
    `/crm/v3/objects/${objectType}/${encodeURIComponent(input.id)}`,
    { method: "DELETE" },
  );
  return { id: input.id, deleted: true };
}

export interface CrmSearchInput {
  query?: string;
  filterGroups?: Array<{
    filters: Array<{
      propertyName: string;
      operator: string;
      value?: unknown;
      values?: unknown[];
    }>;
  }>;
  sorts?: Array<{ propertyName: string; direction: "ASCENDING" | "DESCENDING" }>;
  properties?: string[];
  limit?: number;
  after?: string;
}

export async function crmSearch(
  ctx: HookContext,
  objectType: CrmObjectType,
  input: CrmSearchInput,
): Promise<HubSpotListResponse<HubSpotObject>> {
  const client = new HubSpotClient(ctx);
  return client.request<HubSpotListResponse<HubSpotObject>>(
    `/crm/v3/objects/${objectType}/search`,
    {
      method: "POST",
      body: {
        ...(input.query ? { query: input.query } : {}),
        ...(input.filterGroups ? { filterGroups: input.filterGroups } : {}),
        ...(input.sorts ? { sorts: input.sorts } : {}),
        ...(input.properties ? { properties: input.properties } : {}),
        limit: input.limit ?? 100,
        ...(input.after ? { after: input.after } : {}),
      },
    },
  );
}

export interface CrmBatchCreateInput {
  inputs: Array<{
    properties: Record<string, unknown>;
    associations?: unknown[];
  }>;
}

export async function crmBatchCreate(
  ctx: HookContext,
  objectType: CrmObjectType,
  input: CrmBatchCreateInput,
): Promise<HubSpotListResponse<HubSpotObject>> {
  const client = new HubSpotClient(ctx);
  return client.request<HubSpotListResponse<HubSpotObject>>(
    `/crm/v3/objects/${objectType}/batch/create`,
    {
      method: "POST",
      body: {
        inputs: input.inputs.map((i) => ({
          properties: coerceProperties(i.properties),
          ...(i.associations ? { associations: i.associations } : {}),
        })),
      },
    },
  );
}

export interface CrmBatchUpdateInput {
  inputs: Array<{ id: string; properties: Record<string, unknown> }>;
}

export async function crmBatchUpdate(
  ctx: HookContext,
  objectType: CrmObjectType,
  input: CrmBatchUpdateInput,
): Promise<HubSpotListResponse<HubSpotObject>> {
  const client = new HubSpotClient(ctx);
  return client.request<HubSpotListResponse<HubSpotObject>>(
    `/crm/v3/objects/${objectType}/batch/update`,
    {
      method: "POST",
      body: {
        inputs: input.inputs.map((i) => ({
          id: i.id,
          properties: coerceProperties(i.properties),
        })),
      },
    },
  );
}

export interface CrmBatchDeleteInput {
  ids: string[];
}

export async function crmBatchDelete(
  ctx: HookContext,
  objectType: CrmObjectType,
  input: CrmBatchDeleteInput,
): Promise<{ archived: number }> {
  const client = new HubSpotClient(ctx);
  await client.request<void>(
    `/crm/v3/objects/${objectType}/batch/archive`,
    {
      method: "POST",
      body: { inputs: input.ids.map((id) => ({ id })) },
    },
  );
  return { archived: input.ids.length };
}

/**
 * HubSpot property values are stringly-typed at the wire level: numbers come
 * back as strings, booleans as `"true"`/`"false"`, timestamps as milliseconds.
 * We coerce on the way out to keep JSON payloads well-typed while letting
 * callers pass native JS values.
 */
export function coerceProperties(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === "") continue;
    if (v instanceof Date) {
      out[k] = String(v.getTime());
    } else if (typeof v === "boolean" || typeof v === "number") {
      out[k] = String(v);
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

/** Accept a `"a,b,c"` string or a `["a","b"]` array; return array or undefined. */
export function normalizeCsv(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return v.length ? v : undefined;
  const s = v.trim();
  return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : undefined;
}
