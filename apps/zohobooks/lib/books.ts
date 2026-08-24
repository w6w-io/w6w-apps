/**
 * Shared helpers for Zoho Books' resource endpoints (`/books/v3/{resource}
 * ...`). Contacts, Items, Invoices and Estimates all share the same
 * `{code, message, page_context?, <resourceKey>}` envelope and the same
 * `organization_id`-on-every-call requirement, so the request assembly lives
 * here once and the per-resource action files (`actions/contact-*.ts`,
 * `actions/item-*.ts`, ...) stay thin wrappers that only know their own path
 * and resource key.
 */
import type { HookContext } from "@w6w/types";
import {
  type BooksEnvelope,
  organizationIdFrom,
  type PageContext,
  parseFields,
  unwrapResource,
  ZohoBooksClient,
} from "./client.ts";

export interface BooksListResult<T> {
  data: T[];
  pageContext?: PageContext;
}

export interface BooksListInput {
  organizationId?: string;
  page?: number;
  per_page?: number;
  sort_column?: string;
  sort_order?: "ascending" | "descending";
}

export async function booksList<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: BooksListInput,
  extraQuery: Record<string, string | number | boolean | undefined | null> = {},
): Promise<BooksListResult<T>> {
  const body = await new ZohoBooksClient(ctx).request<BooksEnvelope>(path, {
    query: {
      organization_id: organizationIdFrom(input, ctx),
      page: input.page,
      per_page: input.per_page,
      sort_column: input.sort_column,
      sort_order: input.sort_order,
      ...extraQuery,
    },
  });
  return { data: unwrapResource<T[]>(body, resourceKey), pageContext: body.page_context };
}

export interface BooksGetInput {
  recordId: string;
  organizationId?: string;
}

export async function booksGet<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: BooksGetInput,
): Promise<T> {
  const body = await new ZohoBooksClient(ctx).request<BooksEnvelope>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    { query: { organization_id: organizationIdFrom(input, ctx) } },
  );
  return unwrapResource<T>(body, resourceKey);
}

export interface BooksCreateInput {
  fields: unknown;
  organizationId?: string;
}

export async function booksCreate<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: BooksCreateInput,
): Promise<T> {
  const body = await new ZohoBooksClient(ctx).request<BooksEnvelope>(path, {
    method: "POST",
    query: { organization_id: organizationIdFrom(input, ctx) },
    body: parseFields(input.fields),
  });
  return unwrapResource<T>(body, resourceKey);
}

export interface BooksUpdateInput {
  recordId: string;
  fields: unknown;
  organizationId?: string;
}

export async function booksUpdate<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  resourceKey: string,
  input: BooksUpdateInput,
): Promise<T> {
  const body = await new ZohoBooksClient(ctx).request<BooksEnvelope>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    {
      method: "PUT",
      query: { organization_id: organizationIdFrom(input, ctx) },
      body: parseFields(input.fields),
    },
  );
  return unwrapResource<T>(body, resourceKey);
}

export interface BooksDeleteInput {
  recordId: string;
  organizationId?: string;
}

export interface BooksDeleteResult {
  code: number;
  message: string;
}

export function booksDelete(
  ctx: HookContext,
  path: string,
  input: BooksDeleteInput,
): Promise<BooksDeleteResult> {
  return new ZohoBooksClient(ctx).request<BooksEnvelope>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    { method: "DELETE", query: { organization_id: organizationIdFrom(input, ctx) } },
  );
}

/**
 * A status-transition or notification action with no request body of its own
 * — mark-sent, void, and similar `POST /{resource}/{id}/{verb}` endpoints
 * that only need the record id and the organization.
 */
export function booksStatusAction(
  ctx: HookContext,
  path: string,
  input: { recordId: string; organizationId?: string },
): Promise<BooksDeleteResult> {
  return new ZohoBooksClient(ctx).request<BooksEnvelope>(
    path.replace("{id}", encodeURIComponent(input.recordId)),
    { method: "POST", query: { organization_id: organizationIdFrom(input, ctx) } },
  );
}
