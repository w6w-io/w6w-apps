/**
 * Shared helpers for Zoho Recruit's per-module record endpoints
 * (`/recruit/v2/{module}...`). Candidates, Job Openings and Clients all share
 * the same request/response shape, so the payload assembly lives here once
 * and the per-resource action files (`actions/candidate-*.ts`,
 * `actions/job-opening-*.ts`, `actions/client-*.ts`) stay thin wrappers that
 * only know their own module API name.
 */
import type { HookContext } from "@w6w/types";
import {
  fields as parseFields,
  moduleName,
  unwrapRecordResult,
  unwrapStatusResult,
  ZohoRecruitClient,
  type ZohoRecruitRecordResult,
} from "./client.ts";

export interface RecruitListInfo {
  per_page?: number;
  count?: number;
  page?: number;
  more_records?: boolean;
}

export interface RecruitListResponse<T = Record<string, unknown>> {
  data: T[];
  info?: RecruitListInfo;
}

export interface RecruitListInput {
  /** Comma-separated field API names. Optional — Zoho Recruit returns its default field set when unset. */
  fields?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  converted?: "true" | "false" | "both";
  approved?: "true" | "false" | "both";
}

export function recruitList(
  ctx: HookContext,
  module: string,
  input: RecruitListInput,
): Promise<RecruitListResponse> {
  return new ZohoRecruitClient(ctx).request(`/${moduleName(module)}`, {
    query: {
      fields: input.fields,
      page: input.page,
      per_page: input.per_page,
      sort_by: input.sort_by,
      sort_order: input.sort_order,
      converted: input.converted,
      approved: input.approved,
    },
  });
}

export interface RecruitGetInput {
  recordId: string;
  /** Comma-separated field API names. Optional — Zoho Recruit returns its default field set when unset. */
  fields?: string;
}

export async function recruitGet(
  ctx: HookContext,
  module: string,
  input: RecruitGetInput,
): Promise<Record<string, unknown>> {
  const res = await new ZohoRecruitClient(ctx).request<RecruitListResponse>(
    `/${moduleName(module)}/${encodeURIComponent(input.recordId)}`,
    { query: { fields: input.fields } },
  );
  const record = res.data?.[0];
  if (!record) throw new Error(`Zoho Recruit returned no record for id ${input.recordId}`);
  return record;
}

export interface RecruitCreateInput {
  fields: unknown;
}

export function recruitCreate(
  ctx: HookContext,
  module: string,
  input: RecruitCreateInput,
): Promise<ZohoRecruitRecordResult> {
  return new ZohoRecruitClient(ctx)
    .request<{ data: ZohoRecruitRecordResult[] }>(`/${moduleName(module)}`, {
      method: "POST",
      body: { data: [parseFields(input.fields)] },
    })
    .then(unwrapRecordResult);
}

export interface RecruitUpdateInput {
  recordId: string;
  fields: unknown;
}

export function recruitUpdate(
  ctx: HookContext,
  module: string,
  input: RecruitUpdateInput,
): Promise<ZohoRecruitRecordResult> {
  return new ZohoRecruitClient(ctx)
    .request<{ data: ZohoRecruitRecordResult[] }>(`/${moduleName(module)}`, {
      method: "PUT",
      body: { data: [{ id: input.recordId, ...parseFields(input.fields) }] },
    })
    .then(unwrapRecordResult);
}

export interface RecruitDeleteInput {
  recordId: string;
}

export function recruitDelete(
  ctx: HookContext,
  module: string,
  input: RecruitDeleteInput,
): Promise<ZohoRecruitRecordResult> {
  return new ZohoRecruitClient(ctx)
    .request<{ data: ZohoRecruitRecordResult[] }>(`/${moduleName(module)}`, {
      method: "DELETE",
      query: { ids: input.recordId },
    })
    .then(unwrapRecordResult);
}

export interface RecruitSearchInput {
  module: string;
  criteria?: string;
  email?: string;
  phone?: string;
  word?: string;
  page?: number;
  per_page?: number;
}

/**
 * `GET /{module}/search` — needs the separate `ZohoRecruit.search.READ`
 * scope, documented apart from the `modules` scope family every other action
 * in this app uses.
 */
export function recruitSearch(
  ctx: HookContext,
  input: RecruitSearchInput,
): Promise<RecruitListResponse> {
  if (!input.criteria && !input.email && !input.phone && !input.word) {
    throw new Error("search requires one of `criteria`, `email`, `phone` or `word`.");
  }
  return new ZohoRecruitClient(ctx).request(`/${moduleName(input.module)}/search`, {
    query: {
      criteria: input.criteria,
      email: input.email,
      phone: input.phone,
      word: input.word,
      page: input.page,
      per_page: input.per_page,
    },
  });
}

export interface RecruitChangeStatusInput {
  ids: string;
  status: string;
  comments?: string;
  /** Candidates only — associates the status change with a Job Opening. */
  jobIds?: string;
}

/**
 * `PUT /{module}/status` — moves one or more records to a new pipeline
 * stage. Shared by Candidates (`Candidate_Status`) and Job Openings
 * (`Job_Opening_Status`); the field name that carries the new stage value
 * varies per module, so the caller passes it in.
 */
export function recruitChangeStatus(
  ctx: HookContext,
  module: string,
  statusField: string,
  input: RecruitChangeStatusInput,
): Promise<ZohoRecruitRecordResult[]> {
  const ids = input.ids.split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) throw new Error("`ids` must contain at least one record id.");

  const entry: Record<string, unknown> = {
    ids,
    [statusField]: input.status,
    ...(input.comments ? { comments: input.comments } : {}),
  };
  if (input.jobIds) {
    entry.jobids = input.jobIds.split(",").map((id) => id.trim()).filter(Boolean);
  }

  return new ZohoRecruitClient(ctx)
    .request<{ data: ZohoRecruitRecordResult[][] }>(`/${moduleName(module)}/status`, {
      method: "PUT",
      body: { data: [entry] },
    })
    .then(unwrapStatusResult);
}
