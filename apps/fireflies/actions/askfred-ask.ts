import type { ActionDefinition } from "@w6w/types";
import { csv, FirefliesClient } from "../lib/client.ts";

interface Input {
  query: string;
  transcriptId?: string;
  startTime?: string;
  endTime?: string;
  organizers?: string;
  participants?: string;
  channelIds?: string;
  responseLanguage?: string;
  formatMode?: string;
}

const MUTATION = `
  mutation CreateAskFredThread($input: CreateAskFredThreadInput!) {
    createAskFredThread(input: $input) {
      message {
        id
        thread_id
        query
        answer
        suggested_queries
        status
        created_at
      }
    }
  }
`;

const askfredAsk: ActionDefinition<Input> = {
  key: "askfred-ask",
  type: "perform",
  resource: "askfred",
  title: "Ask Fred",
  description:
    "Ask a natural-language question about one meeting or a filtered set of meetings, and start a thread.",
  // Starts a NEW thread each call and spends AI credits, so it is a `perform`
  // rather than a `read` despite reading like a question.
  idempotent: false,
  params: [
    {
      key: "query",
      label: "Question",
      type: "text",
      required: true,
      config: { multiline: true },
      validation: { maxLength: 2000 },
    },
    {
      key: "transcriptId",
      label: "Transcript ID",
      type: "string",
      hint: "Answer from this meeting only. When set, the filters below are ignored.",
    },
    {
      key: "startTime",
      label: "From",
      type: "datetime",
      row: "range",
      hint: "ISO 8601. Cannot be more than a year back. Defaults to 30 days before To.",
    },
    { key: "endTime", label: "To", type: "datetime", row: "range", hint: "ISO 8601." },
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
    {
      key: "channelIds",
      label: "Channel IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "responseLanguage",
      label: "Answer language",
      type: "string",
      advanced: true,
      row: "fmt",
      hint: "Language code, e.g. `en`, `es`.",
    },
    {
      key: "formatMode",
      label: "Answer format",
      type: "select",
      advanced: true,
      row: "fmt",
      options: [
        { value: "markdown", label: "Markdown" },
        { value: "plaintext", label: "Plain text" },
      ],
    },
  ],
  output: [
    { key: "createAskFredThread.message.thread_id", type: "string", label: "Thread ID" },
    { key: "createAskFredThread.message.answer", type: "string", label: "Answer" },
    { key: "createAskFredThread.message.status", type: "string", label: "Status" },
    {
      key: "createAskFredThread.message.suggested_queries",
      type: "array",
      label: "Suggested follow-ups",
    },
  ],

  execute(input, ctx) {
    // `filters` is only consulted when `transcript_id` is absent, so it is
    // omitted entirely rather than sent alongside — and omitted when empty, so
    // an unfiltered question does not ship a hollow object.
    const filters = {
      start_time: input.startTime || undefined,
      end_time: input.endTime || undefined,
      organizers: csv(input.organizers),
      participants: csv(input.participants),
      channel_ids: csv(input.channelIds),
    };
    const hasFilters = Object.values(filters).some((v) => v !== undefined);

    // AI credits are spent per call; an account without them fails with
    // `require_ai_credits`.
    return new FirefliesClient(ctx).query(MUTATION, {
      input: {
        query: input.query,
        transcript_id: input.transcriptId || undefined,
        filters: input.transcriptId || !hasFilters ? undefined : filters,
        response_language: input.responseLanguage || undefined,
        format_mode: input.formatMode || undefined,
      },
    });
  },
};

export default askfredAsk;
