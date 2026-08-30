import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, ChatbaseClient, compact } from "../lib/client.ts";
import { agentIdParam, sourceIdParam } from "../lib/params.ts";

/**
 * `PUT /agents/{agentId}/sources/{sourceId}` — updates a text, Q&A, or link
 * source in place; only the fields relevant to that source's own type are
 * accepted, and Chatbase rejects the rest (`SOURCE_TYPE_NOT_SUPPORTED` for a
 * Notion source, `SOURCE_URL_IMMUTABLE` if `url` is sent). A link's URL
 * cannot be changed — delete and recreate the source instead. File sources
 * are not covered by this app; see `source-create.ts`.
 */
interface Input {
  agentId: string;
  sourceId: string;
  name?: string;
  content?: string;
  questions?: string[] | string;
  answer?: string;
  excludePaths?: string[] | string;
  includeOnlyPaths?: string[] | string;
  slowScraping?: boolean;
}

function toStringArray(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v;
  return asOptionalJson<string[]>(v, "value") ?? v.split(",").map((s) => s.trim()).filter(Boolean);
}

const sourceUpdate: ActionDefinition<Input> = {
  key: "source-update",
  type: "perform",
  resource: "source",
  title: "Update Source",
  description:
    "Update a text, Q&A, or link source. Only send fields relevant to that source's own type — " +
    "a link's URL is immutable; delete and recreate to change it.",
  idempotent: true,
  params: [
    agentIdParam,
    sourceIdParam,
    { key: "name", label: "Name", type: "string", validation: { maxLength: 100 } },
    { key: "content", label: "Content (text sources)", type: "text" },
    {
      key: "questions",
      label: "Questions (Q&A sources)",
      type: "json",
      hint: "JSON array of 1–50 strings.",
    },
    { key: "answer", label: "Answer (Q&A sources)", type: "text" },
    { key: "excludePaths", label: "Exclude paths (link sources)", type: "json" },
    { key: "includeOnlyPaths", label: "Include only paths (link sources)", type: "json" },
    { key: "slowScraping", label: "Slow scraping (link sources)", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Source ID" },
    { key: "status", type: "string", label: "updated once retrained, if previously trained" },
  ],

  execute(input, ctx) {
    const body = compact({
      name: input.name,
      content: input.content,
      questions: toStringArray(input.questions),
      answer: input.answer,
      excludePaths: toStringArray(input.excludePaths),
      includeOnlyPaths: toStringArray(input.includeOnlyPaths),
      slowScraping: input.slowScraping,
    });
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/sources/${encodeURIComponent(input.sourceId)}`,
      { method: "PUT", body },
    );
  },
};

export default sourceUpdate;
