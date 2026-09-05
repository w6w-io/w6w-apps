import type { HookContext } from "@w6w/types";

/**
 * Manus API v2 REST client (`api.manus.ai`).
 *
 * Everything in this module was verified on 2026-09-05 against Manus's own
 * documentation (`open.manus.ai/docs/v2/*` — Mintlify-hosted; every page also
 * answers as clean markdown at its own `.md` suffix, e.g.
 * `open.manus.ai/docs/v2/task.create.md`) plus the machine-readable OpenAPI
 * document the docs themselves publish at
 * `open.manus.ai/docs/v2/openapi_v2.json` (`servers: [{ url:
 * "https://api.manus.ai" }]`), plus live, unauthenticated and invalid-key
 * probes against `api.manus.ai`. Nothing here came from a third-party
 * integration directory.
 *
 * ## v2, not v1 — the docs say so explicitly
 *
 * `open.manus.ai/docs/llms.txt` lists a full parallel v1 surface
 * (`v1/create-task`, `v1/get-task`, …) alongside v2. The v1 overview page
 * states outright that the reader is "viewing API v2 — the latest version"
 * and that "API v1 has been deprecated and will be removed in the future."
 * Every action in this app is built against v2 only; no v1 path is called or
 * referenced anywhere in this package.
 *
 * ## Auth: a plain header, no per-request signing scheme
 *
 * Every v2 endpoint accepts `x-manus-api-key: <key>` (confirmed by the
 * OpenAPI document's `securitySchemes.ApiKeyAuth`: `{ type: "apiKey", in:
 * "header", name: "x-manus-api-key" }`), or `Authorization: Bearer
 * <access_token>` for a third-party OAuth2 app acting on behalf of a team
 * user. This app only implements the API-key method — see `auth/api-key.ts`
 * for why. A key is account-wide: Manus's own docs state "each key provides
 * full access to your Manus account," so unlike some vendors there is no
 * narrower-scoped credential to prefer for one probe over another.
 *
 * ## Every response is one envelope shape
 *
 * `{"ok": true, "request_id": "...", ...fields}` on success,
 * `{"ok": false, "request_id": "...", "error": {"code": "...", "message":
 * "..."}}` on failure — confirmed live on 2026-09-05 (an unauthenticated
 * `GET /v2/agent.list` and one with a syntactically plausible fake key both
 * returned this exact shape, with HTTP 401 and `error.code` `"unauthenticated"`).
 * HTTP status tracks `ok` (the OpenAPI document declares a `200` success
 * response and a `4XX` error response per endpoint), so `res.ok` is a
 * reliable success signal and this client throws a formatted error on
 * anything else.
 *
 * ## Cursor pagination, not offset/limit
 *
 * Every list endpoint that paginates takes `cursor` (opaque, from the
 * previous page's `next_cursor`) and `limit`, and answers with `has_more` +
 * `next_cursor` alongside its items array (`data` on most endpoints,
 * `messages` on `task.listMessages`). {@link toSearchResult} maps that onto
 * the platform's own `{ items, nextCursor? }` search-action shape
 * (`rfcs/action.md` § Pagination). Unlike some vendors' list filters, none of
 * Manus's documented query parameters are arrays — every filter is a single
 * scalar — so this client's query-string builder does not need repeated-key
 * array handling.
 */

export const API_BASE = "https://api.manus.ai";

// --------------------------------------------------------------- envelope --

export interface ManusApiError {
  code: string;
  message: string;
}

interface ErrorEnvelope {
  ok: false;
  request_id: string;
  error: ManusApiError;
}

/** Keep an error message readable — a body can carry a long description. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Turn Manus's `{ok:false, error:{code,message}}` body into one actionable line. */
export function formatManusError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ErrorEnvelope | null = null;
  try {
    parsed = JSON.parse(raw) as ErrorEnvelope;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.error) {
    return `Manus ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  return `Manus ${status} ${parsed.error.code} for ${method} ${path}: ${
    truncate(parsed.error.message, 600)
  }`;
}

/** Drop keys the caller left unset. `false` and `0` survive: both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Normalise a `multiselect` param into a list, accepting a comma-joined string too. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** The platform's own search-action pagination shape (`rfcs/action.md` § Pagination). */
export interface SearchResult<T> {
  items: T[];
  nextCursor?: string;
}

/** Map Manus's `{data|messages, has_more, next_cursor}` onto `{ items, nextCursor? }`. */
export function toSearchResult<T>(
  items: T[] | undefined,
  hasMore: boolean | undefined,
  nextCursor: string | undefined,
): SearchResult<T> {
  return { items: items ?? [], nextCursor: hasMore ? nextCursor ?? undefined : undefined };
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets the credential header itself —
 * the runtime's Auth `sign` hook stamps `x-manus-api-key` onto the outbound
 * request after this client hands it off; see `auth/api-key.ts`.
 */
export class ManusClient {
  constructor(private ctx: HookContext) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatManusError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

// ------------------------------------------------------------------ tasks --

export type TaskStatus = "running" | "stopped" | "waiting" | "error";
export type TaskType = "standard" | "project" | "agent_subtask";
export type ShareVisibility = "private" | "team" | "public";
/** Legacy, versioned form Manus echoes back on a `Task`. Requests use the stable `AgentProfile`. */
export type LegacyAgentProfile = "manus-1.6" | "manus-1.6-lite" | "manus-1.6-max";
/** The stable values a request should send — versioned aliases are accepted but not modeled here. */
export type AgentProfile = "standard" | "lite" | "max";

export interface Task {
  id: string;
  status: TaskStatus;
  created_at: number;
  updated_at: number;
  task_type?: TaskType;
  share_visibility?: ShareVisibility;
  title?: string;
  /** Only present once the task has consumed credits. */
  credit_usage?: number;
  task_url?: string;
  created_by_api_key?: { id: string; name: string } | null;
  agent_profile?: LegacyAgentProfile;
}

export interface TaskAttachment {
  type: "image" | "file" | "voice" | "slides";
  filename?: string;
  url?: string;
  content_type?: string;
}

export type TaskEventType =
  | "user_message"
  | "assistant_message"
  | "error_message"
  | "status_update"
  | "tool_used"
  | "plan_update"
  | "new_plan_step"
  | "explanation"
  | "user_stop"
  | "structured_output_result";

/** Only one payload field is present on a given event, chosen by `type`. */
export interface TaskEvent {
  id: string;
  type: TaskEventType;
  /** Unix milliseconds — unlike every other timestamp in this API, which is seconds. */
  timestamp: number;
  user_message?: {
    content?: string;
    message_type?: "text" | "voice";
    attachments?: TaskAttachment[];
  };
  assistant_message?: { content?: string; attachments?: TaskAttachment[] };
  error_message?: { error_type?: string; content?: string };
  status_update?: {
    agent_status: TaskStatus;
    status_detail?: {
      waiting_for_event_id?: string;
      waiting_for_event_type?: string;
      waiting_description?: string;
      confirm_input_schema?: unknown;
    };
    brief?: string;
    description?: string;
  };
  /** Only present when the list was requested with `verbose=true`. */
  tool_used?: {
    tool?: string;
    action_id?: string;
    status?: "success" | "error" | "rollback";
    brief?: string;
    description?: string;
    message?: { action?: string; param?: string };
  };
  plan_update?: {
    steps?: Array<{
      status: "todo" | "doing" | "done" | "failed";
      title: string;
      started_at: number | null;
      end_at: number | null;
    }>;
  };
  new_plan_step?: { step_id?: string; title?: string };
  explanation?: { content?: string };
  structured_output_result?: { success: boolean; value: unknown; error: string | null };
}

export interface TextContentPart {
  type: "text";
  text: string;
}

/** Provide the file via exactly one of `file_id`/`file_url`/`file_data`. */
export interface FileContentPart {
  type: "file";
  file_id?: string;
  file_url?: string;
  file_data?: string;
  filename?: string;
  mime_type?: string;
}

/** Provide the audio via exactly one of `file_id`/`file_url`/`file_data`. */
export interface VoiceContentPart {
  type: "voice";
  file_id?: string;
  file_url?: string;
  file_data?: string;
  filename?: string;
  mime_type?: string;
}

export type ContentPart = TextContentPart | FileContentPart | VoiceContentPart;

export interface MessageBody {
  content: string | ContentPart[];
  connectors?: string[];
  enable_skills?: string[];
  force_skills?: string[];
  task_references?: string[];
}

/**
 * Build a `Message.content` from a plain-text prompt plus, optionally, one
 * previously-uploaded or publicly-hosted file. `ContentPart` also allows a
 * `voice` part and inline base64 `file_data`; this app deliberately covers
 * only the common `text` + one `file` (by id or URL) shape rather than
 * modeling every combination, since a workflow step composing a prompt from
 * form fields has no natural way to build an arbitrary content-part array.
 */
export function buildContent(
  text: string | undefined,
  file?: { fileId?: string; fileUrl?: string; fileName?: string },
): string | ContentPart[] {
  const hasFile = Boolean(file?.fileId || file?.fileUrl);
  if (!hasFile) return text ?? "";

  const parts: ContentPart[] = [];
  if (text) parts.push({ type: "text", text });
  parts.push(compact({
    type: "file",
    file_id: file?.fileId,
    file_url: file?.fileUrl,
    filename: file?.fileName,
  }) as unknown as FileContentPart);
  return parts;
}

export interface TaskDetailResponse {
  ok: boolean;
  request_id: string;
  task: Task;
}

export interface TaskListResponse {
  ok: boolean;
  request_id: string;
  data: Task[];
  has_more?: boolean;
  next_cursor?: string;
}

export interface TaskCreateResponse {
  ok: boolean;
  request_id: string;
  task_id: string;
  task_title?: string;
  task_url?: string;
  share_url?: string;
  share_visibility?: ShareVisibility;
}

export interface TaskUpdateResponse extends TaskCreateResponse {}

export interface TaskMutateResponse {
  ok: boolean;
  request_id: string;
}

export interface TaskDeleteResponse {
  ok: boolean;
  request_id: string;
  id: string;
  deleted: boolean;
}

export interface TaskSendMessageResponse {
  ok: boolean;
  request_id: string;
  task_id: string;
}

export interface TaskListMessagesResponse {
  ok: boolean;
  request_id: string;
  task_id: string;
  messages: TaskEvent[];
  has_more?: boolean;
  next_cursor?: string;
}

export interface TaskConfirmActionResponse {
  ok: boolean;
  request_id: string;
  task_id: string;
  confirmed: boolean;
}

// --------------------------------------------------------------- projects --

export interface Project {
  id: string;
  name: string;
  created_at: number;
  instruction?: string;
}

export interface ProjectCreateResponse {
  ok: boolean;
  request_id: string;
  project: Project;
}

export interface ProjectListResponse {
  ok: boolean;
  request_id: string;
  data: Project[];
}

// ----------------------------------------------------------------- skills --

export type SkillOwnerType = "personal" | "official" | "team" | "project";

export interface Skill {
  id: string;
  name: string;
  description?: string;
  owner_type?: SkillOwnerType;
  creator_info?: { user_id?: string; name?: string };
  created_at?: number;
  updated_at?: number;
}

export interface SkillListResponse {
  ok: boolean;
  request_id: string;
  data: Skill[];
}

// ----------------------------------------------------------------- agents --

export interface Agent {
  id: string;
  task_id?: string;
  nickname?: string;
  about?: string;
}

export interface AgentListResponse {
  ok: boolean;
  request_id: string;
  data: Agent[];
}

export interface AgentDetailResponse {
  ok: boolean;
  request_id: string;
  agent: Agent;
}

export interface AgentUpdateResponse {
  ok: boolean;
  request_id: string;
  agent: Agent;
}

// ------------------------------------------------------------------ files --

export type FileStatus = "pending" | "uploaded" | "deleted" | "error";

export interface ManusFile {
  id: string;
  filename?: string;
  status: FileStatus;
  created_at: number;
}

export interface ManusFileDetail extends ManusFile {
  bytes?: number | null;
  content_type?: string;
  expires_at?: number;
  error_message?: string | null;
}

export interface FileUploadResponse {
  ok: boolean;
  request_id: string;
  file: ManusFile;
  upload_url: string;
  upload_expires_at: number;
}

export interface FileDetailResponse {
  ok: boolean;
  request_id: string;
  file: ManusFileDetail;
}

// --------------------------------------------------------------- webhooks --

export interface Webhook {
  id: string;
  url: string;
  status: "active" | "inactive";
  created_at: number;
}

export interface WebhookCreateResponse {
  ok: boolean;
  request_id: string;
  webhook: Webhook;
}

export interface WebhookListResponse {
  ok: boolean;
  request_id: string;
  data: Webhook[];
}

export interface WebhookPublicKeyResponse {
  ok: boolean;
  request_id: string;
  public_key: string;
  algorithm: string;
}

// ---------------------------------------------------------------- browser --

export interface BrowserClient {
  client_id: string;
  client_name?: string;
  ua?: string;
}

export interface BrowserOnlineListResponse {
  ok: boolean;
  request_id: string;
  data: BrowserClient[];
}

// ------------------------------------------------------------------ usage --

export interface AvailableCredits {
  total_credits: number;
  free_credits?: number;
  periodic_credits?: number;
  addon_credits?: number;
  pro_monthly_credits?: number;
  event_credits?: number;
  refresh_credits?: number;
  max_refresh_credits?: number;
  next_refresh_time?: number;
  refresh_interval?: "daily" | "weekly" | "";
  current_period_end?: number;
}

export interface UsageRecord {
  task_id: string;
  title?: string;
  credits: number;
  created_at: number;
  type: "cost" | "refund" | "grant";
  collaborate_infos?: Array<{ user_id?: string; user_name?: string; credits?: number }>;
}

export interface DailyStatistic {
  date: number;
  credits: number;
}

export interface TeamUsageLog {
  user_id: string;
  user_name?: string;
  email?: string;
  task_count: number;
  credits: number;
}

export interface UsageListResponse {
  ok: boolean;
  request_id: string;
  data: UsageRecord[];
  has_more?: boolean;
  next_cursor?: string;
}

export interface UsageTeamStatisticResponse {
  ok: boolean;
  request_id: string;
  data: DailyStatistic[];
}

export interface UsageTeamLogResponse {
  ok: boolean;
  request_id: string;
  data: TeamUsageLog[];
  has_more?: boolean;
  next_cursor?: string;
}

export interface UsageAvailableCreditsResponse {
  ok: boolean;
  request_id: string;
  data: AvailableCredits;
}

// -------------------------------------------------------------- connectors --

export type ConnectorType = "builtin" | "byok" | "mcp";

export interface ConnectorInfo {
  id: string;
  name: string;
  type?: ConnectorType;
  description?: string;
  category?: string;
}

export interface ConnectorListResponse {
  ok: boolean;
  request_id: string;
  data: ConnectorInfo[];
}

// ---------------------------------------------------------------- website --

export type PublishStatus = "unpublished" | "publishing" | "published" | "failed";
export type SiteVisibility = "public" | "team" | "private";
export type PublishVisibility = "public" | "team";
export type CheckpointStatus = "pending" | "success" | "failed" | "unspecified";

export interface WebsiteCheckpoint {
  version_id: string;
  message?: string;
  status?: CheckpointStatus;
  created_at?: number;
}

export interface WebsiteStatusResponse {
  ok: boolean;
  request_id: string;
  website_id: string;
  publish_status: PublishStatus;
  site_urls: string[];
  version_id?: string;
  status_updated_at?: number;
  visibility?: SiteVisibility;
}

export interface WebsiteListCheckpointsResponse {
  ok: boolean;
  request_id: string;
  website_id: string;
  data: WebsiteCheckpoint[];
  published_version_id?: string;
}

export interface WebsitePublishResponse {
  ok: boolean;
  request_id: string;
  website_id: string;
  version_id: string;
}

export interface WebsiteUpdateResponse {
  ok: boolean;
  request_id: string;
}
