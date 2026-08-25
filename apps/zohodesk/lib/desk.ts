/**
 * Shared helpers for Zoho Desk's resource endpoints (`/api/v1/{resource}...`).
 * Tickets, Contacts and Accounts all share the same `{"data": [...]}` list
 * envelope, bare-object Get response, and mandatory `orgId` header
 * requirement, so the request assembly lives here once and the per-resource
 * action files (`actions/ticket-*.ts`, `actions/contact-*.ts`, ...) stay thin
 * wrappers that only know their own path.
 */
import type { HookContext } from "@w6w/types";
import { orgIdFrom, parseFields, ZohoDeskClient } from "./client.ts";
import type { DeskListEnvelope } from "./client.ts";

export type { DeskListEnvelope };

export interface DeskListInput {
  orgId?: string;
  from?: number;
  limit?: number;
}

export async function deskList<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  input: DeskListInput,
  extraQuery: Record<string, string | number | boolean | undefined | null> = {},
): Promise<DeskListEnvelope<T>> {
  const body = await new ZohoDeskClient(ctx).request<DeskListEnvelope<T>>(path, {
    orgId: orgIdFrom(input, ctx),
    query: { from: input.from, limit: input.limit, ...extraQuery },
  });
  return { data: body.data ?? [] };
}

export interface DeskGetInput {
  recordId: string;
  orgId?: string;
}

export function deskGet<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  input: DeskGetInput,
  query: Record<string, string | number | boolean | undefined | null> = {},
): Promise<T> {
  return new ZohoDeskClient(ctx).request<T>(`${path}/${encodeURIComponent(input.recordId)}`, {
    orgId: orgIdFrom(input, ctx),
    query,
  });
}

export interface DeskCreateInput {
  fields: unknown;
  orgId?: string;
}

export function deskCreate<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  input: DeskCreateInput,
): Promise<T> {
  return new ZohoDeskClient(ctx).request<T>(path, {
    method: "POST",
    orgId: orgIdFrom(input, ctx),
    body: parseFields(input.fields),
  });
}

export interface DeskUpdateInput {
  recordId: string;
  fields: unknown;
  orgId?: string;
}

export function deskUpdate<T = Record<string, unknown>>(
  ctx: HookContext,
  path: string,
  input: DeskUpdateInput,
): Promise<T> {
  return new ZohoDeskClient(ctx).request<T>(
    `${path}/${encodeURIComponent(input.recordId)}`,
    {
      method: "PATCH",
      orgId: orgIdFrom(input, ctx),
      body: parseFields(input.fields),
    },
  );
}

export interface DeskDeleteInput {
  recordId: string;
  orgId?: string;
}

/**
 * Zoho Desk has no single-record DELETE for Tickets/Contacts/Accounts — only
 * a bulk `POST {resource}/moveToTrash` taking an array of ids, answering
 * `204 No Content` (confirmed live for all three resources). This wraps the
 * single id this app exposes per action into that array, so the action still
 * reads and behaves like every other single-record delete in the pack.
 */
export async function deskMoveToTrash(
  ctx: HookContext,
  path: string,
  idsField: string,
  input: DeskDeleteInput,
): Promise<{ deleted: true }> {
  await new ZohoDeskClient(ctx).request<undefined>(`${path}/moveToTrash`, {
    method: "POST",
    orgId: orgIdFrom(input, ctx),
    body: { [idsField]: [input.recordId] },
  });
  return { deleted: true };
}
