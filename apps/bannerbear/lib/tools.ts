import type { HookContext } from "@w6w/types";
import { BannerbearClient, compact } from "./client.ts";

/**
 * The response shape shared by all 16 `/tools/*` endpoints, verified
 * identical across every one of them in the OpenAPI document (fetched
 * 2026-08-29): only `tool` (a fixed per-endpoint enum) and the shape inside
 * `outputs` differ. Async on every tool — a `202` with a pending job; poll
 * `tool-job-get` or subscribe a `resource: "tool_job"` Webhook.
 */
export interface ToolJob<TOutputs = Record<string, unknown>> {
  uid: string;
  tool: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  inputs?: Record<string, unknown>;
  outputs?: TOutputs;
  metadata?: string | null;
  self?: string;
  created_at?: string;
  completed_at?: string | null;
  error_message?: string | null;
}

/** `POST /tools/{tool}` — shared by every `tool-*` action. */
export function runTool<TOutputs = Record<string, unknown>>(
  ctx: HookContext,
  tool: string,
  body: Record<string, unknown>,
): Promise<ToolJob<TOutputs>> {
  return new BannerbearClient(ctx).json<ToolJob<TOutputs>>(`/tools/${tool}`, {
    method: "POST",
    body: compact(body),
  });
}
