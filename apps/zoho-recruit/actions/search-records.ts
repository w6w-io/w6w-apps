import type { ActionDefinition } from "@w6w/types";
import { recruitSearch, type RecruitSearchInput } from "../lib/recruit.ts";

/**
 * `GET /{module}/search` works the same way for every module — Candidates,
 * Job Openings, Clients, Contacts, Interviews, or a custom module — so this
 * one action covers all of them instead of a `*-search` file per resource.
 * This is the one endpoint Zoho Recruit documents under a SEPARATE scope,
 * `ZohoRecruit.search.READ` — see `auth/oauth2.ts`.
 */
const searchRecords: ActionDefinition<RecruitSearchInput> = {
  key: "search-records",
  type: "search",
  resource: "query",
  title: "Search Records",
  description:
    "Search any module's records by criteria, email, phone or a free-text word. Exactly one of those four is required.",
  params: [
    {
      key: "module",
      label: "Module",
      type: "string",
      required: true,
      placeholder: "Candidates",
      hint: "API name of the module: `Candidates`, `Job_Openings`, `Clients`, or a custom one.",
    },
    {
      key: "criteria",
      label: "Criteria",
      type: "string",
      placeholder: "(Last_Name:equals:Smith)",
      hint: "Zoho's criteria syntax: `(Field:operator:value)`, combined with `and`/`or`.",
    },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "word", label: "Word", type: "string", hint: "Global free-text search." },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "per_page", label: "Per page", type: "number", default: 200, hint: "Max 200." },
  ],
  output: [
    { key: "data", type: "array", label: "Matching records" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return recruitSearch(ctx, input);
  },
};

export default searchRecords;
