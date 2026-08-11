import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient } from "../lib/client.ts";
import { libraryCategoryOptions, librarySortOptions } from "../lib/params.ts";

/**
 * `GET /v1/shared-voices` — search the public Voice Library.
 *
 * This is the catalogue other people have shared, not the account's own voices;
 * List Voices covers those. A result carries `public_owner_id` and `voice_id`,
 * and that pair is exactly what Add Voice from Library needs to copy one into
 * the account.
 *
 * ## It is credential-gated, but only past three results
 *
 * Called with no credential it answers `401` with the unusually specific
 * message "You must be logged in to fetch more than 3 voices" (measured
 * 2026-08-11) — so it is a partially-public endpoint, and for that reason it is
 * not a candidate for the health probe either.
 *
 * ## Page-number paging, unlike List Voices
 *
 * This endpoint takes `page` (0-based) and `page_size` (max 100, default 30) and
 * returns `has_more`. That is a different scheme from `/v2/voices`, which uses an
 * opaque `next_page_token`; the two are not interchangeable.
 */
interface Input {
  search?: string;
  category?: string;
  language?: string;
  gender?: string;
  age?: string;
  accent?: string;
  useCases?: string;
  featured?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

const voiceLibrarySearch: ActionDefinition<Input> = {
  key: "voice-library-search",
  type: "search",
  resource: "voice",
  title: "Search Voice Library",
  description: "Search the public Voice Library for voices you can add to this account.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Free-text search term." },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: libraryCategoryOptions,
    },
    { key: "language", label: "Language", type: "string", placeholder: "en" },
    { key: "gender", label: "Gender", type: "string" },
    { key: "age", label: "Age", type: "string", placeholder: "middle_aged" },
    { key: "accent", label: "Accent", type: "string", placeholder: "british" },
    {
      key: "useCases",
      label: "Use case",
      type: "string",
      advanced: true,
      placeholder: "narration",
    },
    {
      key: "featured",
      label: "Featured only",
      type: "boolean",
      advanced: true,
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: librarySortOptions,
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Zero-based page number. This endpoint pages by number, not by token.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 30,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Maximum 100; the API's own default is 30.",
    },
  ],
  output: [
    { key: "voices", type: "array", label: "Shared voices, each with public_owner_id + voice_id" },
    { key: "has_more", type: "boolean", label: "Whether another page exists" },
    { key: "total_count", type: "number", label: "Total matches" },
  ],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json("/v1/shared-voices", {
      query: {
        search: input.search,
        category: input.category,
        language: input.language,
        gender: input.gender,
        age: input.age,
        accent: input.accent,
        use_cases: input.useCases,
        featured: input.featured === true ? "true" : undefined,
        sort: input.sort,
        page: input.page,
        page_size: input.pageSize,
      },
    });
  },
};

export default voiceLibrarySearch;
