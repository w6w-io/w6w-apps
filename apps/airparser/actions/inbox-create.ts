import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `POST /inboxes/create` — create a new inbox.
 *
 * `llmEngine` selects the parsing engine: `text` (reads extracted/OCR'd text)
 * or `vision` (reads the document as an image, for layouts text extraction
 * loses — scans, complex tables). No extraction schema is required at create
 * time: uploading the inbox's first document auto-generates one from its
 * content.
 */
interface Input {
  name: string;
  llmEngine?: string;
}

interface Output {
  _id: string;
  name: string;
  llm_engine?: string;
}

const inboxCreate: ActionDefinition<Input, Output> = {
  key: "inbox-create",
  type: "perform",
  resource: "inbox",
  title: "Create Inbox",
  description:
    "Create a new inbox. No extraction schema is required — uploading the first document " +
    "generates one automatically from its content.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "llmEngine",
      label: "Parsing engine",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "vision", label: "Vision" },
      ],
      hint: "Leave empty to use the account's default.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Inbox ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "llm_engine", type: "string", label: "Parsing engine" },
  ],

  execute(input, ctx) {
    return new AirparserClient(ctx).request<Output>("/inboxes/create", {
      method: "POST",
      body: { name: input.name, llm_engine: input.llmEngine },
    });
  },
};

export default inboxCreate;
