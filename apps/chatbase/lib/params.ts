import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Chatbase actions.
 *
 * Every field, default, and limit here is copied from Chatbase's own OpenAPI
 * document (`api-v2-merged-openapi.json`, fetched 2026-08-29), not inferred.
 */

export const agentIdParam: Param = {
  key: "agentId",
  label: "Agent",
  type: "string",
  required: true,
  placeholder: "5QHA6VB-DIAbBhxwqxfdi",
  hint: "The agent's ID, from the Chatbase dashboard URL or a List Agents / Create Agent call.",
};

export const conversationIdParam: Param = {
  key: "conversationId",
  label: "Conversation ID",
  type: "string",
  required: true,
};

export const sourceIdParam: Param = {
  key: "sourceId",
  label: "Source ID",
  type: "string",
  required: true,
};

export const ticketNumberParam: Param = {
  key: "ticketNumber",
  label: "Ticket Number",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
  hint: "The per-agent ticket number shown in the helpdesk, e.g. 123 — not a UUID.",
};

export const userIdParam: Param = {
  key: "userId",
  label: "User ID",
  type: "string",
  required: true,
  validation: { pattern: "^[a-zA-Z0-9._-]+$", maxLength: 128 },
  hint: "URL-safe characters only (letters, digits, `.`, `_`, `-`), max 128 chars.",
};

/**
 * `cursor` + `limit`, the pair every v2 list endpoint documents. The vendor
 * default for `limit` is 20 (max 100 on most lists) — kept as the default
 * here too, since unlike some vendors Chatbase does not silently balloon it.
 */
export function paginationParams(maxLimit = 100): Param[] {
  return [
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint:
        "Opaque cursor from a previous page's `pagination.cursor`. Omit to start from the beginning.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1, max: maxLimit },
      hint: `Items per page, 1–${maxLimit}.`,
    },
  ];
}

export interface PaginationInput {
  cursor?: string;
  limit?: number;
}

export function paginationQuery(
  input: PaginationInput,
): Record<string, string | number | undefined> {
  return { cursor: input.cursor, limit: input.limit };
}

export const modelOptions = [
  { value: "auto", label: "Auto (Chatbase picks)" },
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { value: "gpt-5.5", label: "GPT-5.5" },
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5-mini", label: "GPT-5 mini" },
  { value: "gpt-5-nano", label: "GPT-5 nano" },
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
  { value: "gpt-oss-120b", label: "GPT-OSS 120B" },
  { value: "gpt-oss-20b", label: "GPT-OSS 20B" },
  { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
  { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { value: "claude-opus-4-5", label: "Claude Opus 4.5" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
  { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  { value: "gemini-3-flash", label: "Gemini 3 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "grok-4", label: "Grok 4" },
  { value: "grok-3", label: "Grok 3" },
  { value: "grok-3-mini", label: "Grok 3 mini" },
  { value: "DeepSeek-V4-Flash", label: "DeepSeek V4 Flash" },
  { value: "DeepSeek-V3", label: "DeepSeek V3" },
  { value: "DeepSeek-R1", label: "DeepSeek R1" },
  { value: "Llama-4-Maverick-17B-128E-Instruct-FP8", label: "Llama 4 Maverick 17B" },
  { value: "Llama-4-Scout-17B-16E-Instruct", label: "Llama 4 Scout 17B" },
  { value: "kimi-k2", label: "Kimi K2" },
  { value: "mistral-medium-3.5", label: "Mistral Medium 3.5" },
  { value: "mistral-small-2603", label: "Mistral Small 2603" },
  { value: "glm-5.2", label: "GLM 5.2" },
];

export const sourceTypeOptions = [
  { value: "text", label: "Text" },
  { value: "qna", label: "Q&A" },
  { value: "link", label: "Link" },
];

export const linkTypeOptions = [
  { value: "individual", label: "Individual page" },
  { value: "sitemap", label: "Sitemap" },
  { value: "crawl", label: "Crawl" },
];

export const ticketStatusCategoryOptions = [
  { value: "new", label: "New" },
  { value: "on_you", label: "On you" },
  { value: "on_customer", label: "On customer" },
  { value: "on_hold", label: "On hold" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export const ticketChannelOptions = [
  { value: "helpdesk", label: "Helpdesk" },
  { value: "iframe", label: "Iframe" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "api", label: "API" },
  { value: "messenger", label: "Messenger" },
  { value: "instagram", label: "Instagram" },
  { value: "center_stage", label: "Center stage" },
  { value: "phone", label: "Phone" },
];
