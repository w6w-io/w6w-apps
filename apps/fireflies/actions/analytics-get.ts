import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

interface Input {
  startTime?: string;
  endTime?: string;
  includeUsers?: boolean;
}

const TEAM_FIELDS = `
  team {
    conversation {
      average_filler_words
      average_filler_words_diff_pct
      average_monologues_count
      average_questions
      average_sentiments { negative_pct neutral_pct positive_pct }
      average_silence_duration
      average_talk_listen_ratio
      average_words_per_minute
      longest_monologue_duration_sec
      total_filler_words
      total_meeting_notes_count
      total_meetings_count
      total_monologues_count
      total_questions
      total_silence_duration
      teammates_count
    }
    meeting {
      count
      count_diff_pct
      duration
      duration_diff_pct
      average_count
      average_duration
    }
  }
`;

const USER_ROLLUP_FIELDS = `
  users {
    user_id
    user_name
    user_email
    conversation {
      talk_listen_pct
      talk_listen_ratio
      total_silence_duration
      total_speak_duration
      total_word_count
      user_filler_words
      user_longest_monologue_sec
      user_monologues_count
      user_questions
      user_words_per_minute
    }
    meeting { count count_diff count_diff_pct duration duration_diff_pct }
  }
`;

/**
 * `start_time` / `end_time` are `String` on this query, not `DateTime` — the
 * `transcripts` query uses `DateTime` for its equivalent `fromDate`/`toDate`,
 * so the two are not interchangeable and the variable types differ accordingly.
 */
function buildQuery(includeUsers: boolean): string {
  return `
    query Analytics($startTime: String, $endTime: String) {
      analytics(start_time: $startTime, end_time: $endTime) {
        ${TEAM_FIELDS}
        ${includeUsers ? USER_ROLLUP_FIELDS : ""}
      }
    }
  `;
}

const analyticsGet: ActionDefinition<Input> = {
  key: "analytics-get",
  type: "read",
  resource: "analytics",
  title: "Get Conversation Analytics",
  description:
    "Team-level meeting and conversation analytics over a date range — talk/listen ratio, filler words, sentiment, monologues.",
  params: [
    {
      key: "startTime",
      label: "From",
      type: "datetime",
      row: "range",
      hint: "ISO 8601, e.g. 2026-01-01T00:00:00Z.",
    },
    { key: "endTime", label: "To", type: "datetime", row: "range", hint: "ISO 8601." },
    {
      key: "includeUsers",
      label: "Include per-user breakdown",
      type: "boolean",
      default: false,
      hint: "Adds a row per teammate alongside the team roll-up.",
    },
  ],
  output: [
    { key: "analytics.team", type: "object", label: "Team analytics" },
    { key: "analytics.users", type: "array", label: "Per-user analytics" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(buildQuery(input.includeUsers === true), {
      startTime: input.startTime,
      endTime: input.endTime,
    });
  },
};

export default analyticsGet;
