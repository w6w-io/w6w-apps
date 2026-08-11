import type { ActionDefinition } from "@w6w/types";
import { BITE_FIELDS, FirefliesClient, intArg } from "../lib/client.ts";

interface Input {
  mine?: boolean;
  myTeam?: boolean;
  transcriptId?: string;
  limit?: number;
  skip?: number;
}

/** `limit` / `skip` inlined as integer literals — see `intArg` in `lib/client.ts`. */
function buildQuery(input: Input): string {
  const page = `${intArg("limit", input.limit)}${intArg("skip", input.skip)}`;
  return `
    query Bites($mine: Boolean, $myTeam: Boolean, $transcriptId: ID) {
      bites(mine: $mine, my_team: $myTeam, transcript_id: $transcriptId${page}) {
        ${BITE_FIELDS}
        sources { src type }
      }
    }
  `;
}

const biteSearch: ActionDefinition<Input> = {
  key: "bite-search",
  type: "search",
  resource: "bite",
  title: "Search Soundbites",
  description: "List soundbites owned by you, by your team, or clipped from one transcript.",
  params: [
    {
      key: "mine",
      label: "Only mine",
      type: "boolean",
      default: true,
      row: "who",
      hint:
        "Fireflies rejects this query with `args_required` unless at least one of Only mine, Whole team or Transcript ID is set.",
    },
    { key: "myTeam", label: "Whole team", type: "boolean", row: "who" },
    {
      key: "transcriptId",
      label: "Transcript ID",
      type: "string",
      hint: "Restrict to soundbites clipped from this meeting.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 50 },
      hint: "Fireflies caps this at 50 per query.",
    },
    { key: "skip", label: "Skip", type: "number", validation: { integer: true, min: 0 } },
  ],
  output: [
    { key: "bites", type: "array", label: "Soundbites" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(buildQuery(input), {
      mine: input.mine,
      myTeam: input.myTeam,
      transcriptId: input.transcriptId,
    });
  },
};

export default biteSearch;
