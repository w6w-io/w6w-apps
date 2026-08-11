import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

interface Input {
  threadId: string;
  query: string;
  responseLanguage?: string;
  formatMode?: string;
}

const MUTATION = `
  mutation ContinueAskFredThread($input: ContinueAskFredThreadInput!) {
    continueAskFredThread(input: $input) {
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

const askfredContinue: ActionDefinition<Input> = {
  key: "askfred-continue",
  type: "perform",
  resource: "askfred",
  title: "Ask Fred a Follow-up",
  description: "Ask a follow-up question in an existing AskFred thread, keeping its context.",
  idempotent: false,
  params: [
    {
      key: "threadId",
      label: "Thread ID",
      type: "string",
      required: true,
      hint: "The `thread_id` returned by `askfred-ask`.",
    },
    {
      key: "query",
      label: "Follow-up question",
      type: "text",
      required: true,
      config: { multiline: true },
      validation: { maxLength: 2000 },
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
    { key: "continueAskFredThread.message.thread_id", type: "string", label: "Thread ID" },
    { key: "continueAskFredThread.message.answer", type: "string", label: "Answer" },
    { key: "continueAskFredThread.message.status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(MUTATION, {
      input: {
        thread_id: input.threadId,
        query: input.query,
        response_language: input.responseLanguage || undefined,
        format_mode: input.formatMode || undefined,
      },
    });
  },
};

export default askfredContinue;
