import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, linkTypeOptions, sourceTypeOptions } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/sources` — accepts `text`, `qna`, and `link`
 * source types; the request body is a discriminated union on `type`. File
 * sources need their own multipart endpoint on a different host
 * (`files.chatbase.co`) and are not covered by this app — see the app
 * README for why.
 */
interface Input {
  agentId: string;
  type: "text" | "qna" | "link";
  name?: string;
  content?: string;
  questions?: string[] | string;
  answer?: string;
  url?: string;
  linkType?: "individual" | "sitemap" | "crawl";
  excludePaths?: string[] | string;
  includeOnlyPaths?: string[] | string;
  slowScraping?: boolean;
}

function toStringArray(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v;
  return asOptionalJson<string[]>(v, "value") ?? v.split(",").map((s) => s.trim()).filter(Boolean);
}

const sourceCreate: ActionDefinition<Input> = {
  key: "source-create",
  type: "perform",
  resource: "source",
  title: "Create Source",
  description:
    "Create a text, Q&A, or link knowledge source for an agent. File uploads use a separate " +
    "endpoint this app does not cover — see the README.",
  idempotent: false,
  params: [
    agentIdParam,
    {
      key: "type",
      label: "Source type",
      type: "select",
      required: true,
      options: sourceTypeOptions,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      validation: { maxLength: 100 },
      showIf: { "!=": [{ var: "type" }, "link"] },
      hint: "Required for text and Q&A sources.",
    },
    {
      key: "content",
      label: "Content",
      type: "text",
      showIf: { "==": [{ var: "type" }, "text"] },
      hint: "Required for text sources. Max 1,048,576 characters.",
    },
    {
      key: "questions",
      label: "Questions",
      type: "json",
      showIf: { "==": [{ var: "type" }, "qna"] },
      hint: "Required for Q&A sources. A JSON array of 1–50 question strings.",
    },
    {
      key: "answer",
      label: "Answer",
      type: "text",
      showIf: { "==": [{ var: "type" }, "qna"] },
      hint: "Required for Q&A sources.",
    },
    {
      key: "url",
      label: "URL",
      type: "string",
      showIf: { "==": [{ var: "type" }, "link"] },
      hint: "Required for link sources.",
    },
    {
      key: "linkType",
      label: "Link type",
      type: "select",
      options: linkTypeOptions,
      showIf: { "==": [{ var: "type" }, "link"] },
      hint: "Required for link sources.",
    },
    {
      key: "excludePaths",
      label: "Exclude paths",
      type: "json",
      showIf: { "==": [{ var: "type" }, "link"] },
      hint: "Link sources only. JSON array of path patterns to skip during a crawl/sitemap.",
    },
    {
      key: "includeOnlyPaths",
      label: "Include only paths",
      type: "json",
      showIf: { "==": [{ var: "type" }, "link"] },
      hint: "Link sources only. JSON array of path patterns; only these are crawled.",
    },
    {
      key: "slowScraping",
      label: "Slow scraping",
      type: "boolean",
      showIf: { "==": [{ var: "type" }, "link"] },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Source ID" },
    { key: "status", type: "string", label: "untrained until the agent is retrained" },
  ],

  execute(input, ctx) {
    let body: Record<string, unknown>;
    if (input.type === "text") {
      body = { type: "text", name: input.name, content: input.content };
    } else if (input.type === "qna") {
      body = {
        type: "qna",
        name: input.name,
        questions: toStringArray(input.questions),
        answer: input.answer,
      };
    } else {
      body = {
        type: "link",
        url: input.url,
        linkType: input.linkType,
        excludePaths: toStringArray(input.excludePaths),
        includeOnlyPaths: toStringArray(input.includeOnlyPaths),
        slowScraping: input.slowScraping,
      };
    }
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/sources`,
      { method: "POST", body },
    );
  },
};

export default sourceCreate;
