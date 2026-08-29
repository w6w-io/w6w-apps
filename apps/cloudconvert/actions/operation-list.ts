import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";

/**
 * `GET /v2/operations` — the catalog of every supported operation, format pair, engine
 * and (optionally) its options.
 *
 * ## Public — no credential needed, measured live
 *
 * `GET https://api.cloudconvert.com/v2/operations` answered `200` with no `Authorization`
 * header at all on 2026-08-29 (351,727 bytes, unfiltered). This is why it is **not** the
 * auth probe in `auth/api-token.ts` — a Connection whose credential never got attached
 * would pass a check against it, exactly the trap Apify's `/v2/store` sets. It is left
 * `requiresAuth: false` here for the same reason: it genuinely needs none.
 *
 * The response is large unfiltered, so the filters below (mirroring the vendor's own
 * `filter[operation]`/`filter[input_format]`/`filter[output_format]`/`filter[engine]`)
 * are surfaced rather than defaulted away — a workflow that wants "every PDF-producing
 * conversion" should ask for exactly that.
 */
interface Input {
  filterOperation?: string;
  filterInputFormat?: string;
  filterOutputFormat?: string;
  filterEngine?: string;
  filterEngineVersion?: string;
  alternatives?: boolean;
  include?: string[] | string;
}

const operationList: ActionDefinition<Input> = {
  key: "operation-list",
  type: "search",
  resource: "operation",
  title: "List Operations",
  description: "List possible operations, format pairs, engines and their options — public, " +
    "no credential required.",
  requiresAuth: false,
  params: [
    {
      key: "filterOperation",
      label: "Operation",
      type: "string",
      placeholder: "convert",
      hint: "e.g. convert or optimize.",
    },
    { key: "filterInputFormat", label: "Input format", type: "string", placeholder: "docx" },
    { key: "filterOutputFormat", label: "Output format", type: "string", placeholder: "pdf" },
    { key: "filterEngine", label: "Engine", type: "string" },
    { key: "filterEngineVersion", label: "Engine version", type: "string", advanced: true },
    {
      key: "alternatives",
      label: "Include alternative engines",
      type: "boolean",
      hint: "Some formats support more than one engine. Off by default, matching the API.",
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "options", label: "Options" },
        { value: "engine_versions", label: "Engine versions" },
      ],
      hint: "Include each conversion type's possible options and/or compatible engine versions.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Operations" }],

  execute(input, ctx) {
    // Not `.data()`: unlike jobs/tasks/webhooks, CloudConvert's own response here is
    // just `{"data": [...]}` with no pagination envelope at all — measured live
    // 2026-08-29, 2,876 unfiltered entries, no `links`/`meta` — so `.json()` keeps the
    // shape this action's `output` actually declares instead of unwrapping it away.
    return new CloudConvertClient(ctx).json(`/operations`, {
      query: {
        "filter[operation]": input.filterOperation,
        "filter[input_format]": input.filterInputFormat,
        "filter[output_format]": input.filterOutputFormat,
        "filter[engine]": input.filterEngine,
        "filter[engine_version]": input.filterEngineVersion,
        alternatives: input.alternatives,
        include: input.include,
      },
    });
  },
};

export default operationList;
