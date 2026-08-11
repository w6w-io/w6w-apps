import type { ActionDefinition } from "@w6w/types";
import { csv, FirefliesClient, intArg, SUMMARY_FIELDS, TRANSCRIPT_CORE } from "../lib/client.ts";

interface Input {
  keyword?: string;
  scope?: string;
  fromDate?: string;
  toDate?: string;
  mine?: boolean;
  userId?: string;
  hostEmail?: string;
  organizers?: string;
  participants?: string;
  channelId?: string;
  limit?: number;
  skip?: number;
  includeSummary?: boolean;
}

/**
 * `limit` and `skip` are inlined as integer literals rather than declared as
 * variables — see `intArg` in `lib/client.ts` for why the vendor's own docs
 * make their scalar type unsafe to guess. Everything else is a variable.
 *
 * `title` / `organizer_email` / `participant_email` / `date` are all documented
 * as deprecated on this query and are deliberately not exposed; `keyword`,
 * `organizers`, `participants` and `fromDate`/`toDate` replace them.
 */
function buildQuery(input: Input): string {
  const page = `${intArg("limit", input.limit)}${intArg("skip", input.skip)}`;
  return `
    query Transcripts(
      $keyword: String
      $scope: TranscriptsQueryScope
      $fromDate: DateTime
      $toDate: DateTime
      $mine: Boolean
      $userId: String
      $hostEmail: String
      $organizers: [String]
      $participants: [String]
      $channelId: String
    ) {
      transcripts(
        keyword: $keyword
        scope: $scope
        fromDate: $fromDate
        toDate: $toDate
        mine: $mine
        user_id: $userId
        host_email: $hostEmail
        organizers: $organizers
        participants: $participants
        channel_id: $channelId${page}
      ) {
        ${TRANSCRIPT_CORE}
        ${input.includeSummary ? SUMMARY_FIELDS : ""}
      }
    }
  `;
}

const transcriptSearch: ActionDefinition<Input> = {
  key: "transcript-search",
  type: "search",
  resource: "transcript",
  title: "Search Transcripts",
  description: "List meeting transcripts, filtered by keyword, date range, people or channel.",
  params: [
    {
      key: "keyword",
      label: "Keyword",
      type: "string",
      hint:
        "Searches meeting titles, or spoken words when Search scope is set. Max 255 characters.",
    },
    {
      key: "scope",
      label: "Search scope",
      type: "select",
      dependsOn: ["keyword"],
      options: [
        { value: "title", label: "Title only (default)" },
        { value: "sentences", label: "Spoken words only" },
        { value: "all", label: "Title and spoken words" },
      ],
      hint: "Setting a scope makes Keyword required.",
    },
    {
      key: "fromDate",
      label: "From",
      type: "datetime",
      row: "range",
      hint: "ISO 8601, e.g. 2026-07-08T22:13:46.660Z.",
    },
    { key: "toDate", label: "To", type: "datetime", row: "range", hint: "ISO 8601." },
    {
      key: "mine",
      label: "Only my meetings",
      type: "boolean",
      hint: "Meetings organised by the API key's owner.",
    },
    { key: "userId", label: "User ID", type: "string", advanced: true },
    { key: "hostEmail", label: "Host email", type: "string", advanced: true },
    {
      key: "organizers",
      label: "Organizer emails",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "participants",
      label: "Participant emails",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    { key: "channelId", label: "Channel ID", type: "string", advanced: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 50 },
      hint: "Fireflies caps this at 50 per query.",
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Offset for paging. Combine with Limit.",
    },
    {
      key: "includeSummary",
      label: "Include AI summary",
      type: "boolean",
      default: false,
      hint: "Off by default — one summary per result is a lot of payload for a list.",
    },
  ],
  output: [
    { key: "transcripts", type: "array", label: "Transcripts" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(buildQuery(input), {
      keyword: input.keyword,
      scope: input.scope,
      fromDate: input.fromDate,
      toDate: input.toDate,
      mine: input.mine,
      userId: input.userId,
      hostEmail: input.hostEmail,
      organizers: csv(input.organizers),
      participants: csv(input.participants),
      channelId: input.channelId,
    });
  },
};

export default transcriptSearch;
