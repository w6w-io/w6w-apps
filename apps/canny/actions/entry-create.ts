import type { ActionDefinition } from "@w6w/types";
import { CannyClient, toList } from "../lib/client.ts";
import { entryOutput } from "../lib/output.ts";
import { entryTypeOptions } from "../lib/params.ts";

/** `POST /v1/entries/create` — create, and optionally publish or schedule, a changelog entry. */
interface Input {
  title: string;
  details: string;
  type?: string;
  notify?: boolean;
  published?: boolean;
  publishedOn?: string;
  scheduledFor?: string;
  labelIDs?: string[] | string;
  postIDs?: string[] | string;
}

const entryCreate: ActionDefinition<Input> = {
  key: "entry-create",
  type: "perform",
  resource: "entry",
  title: "Create Changelog Entry",
  description: "Create a changelog entry, optionally publishing or scheduling it immediately.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "details", label: "Details", type: "text", required: true },
    { key: "type", label: "Type", type: "select", options: entryTypeOptions },
    {
      key: "published",
      label: "Publish immediately",
      type: "boolean",
      default: false,
    },
    {
      key: "publishedOn",
      label: "Published on",
      type: "datetime",
      advanced: true,
      hint: "Only used with Publish immediately, to backdate the published date (ISO 8601).",
    },
    {
      key: "scheduledFor",
      label: "Scheduled for",
      type: "datetime",
      advanced: true,
      hint: "A future date (ISO 8601) to auto-publish this entry.",
    },
    {
      key: "notify",
      label: "Notify users by email",
      type: "boolean",
      advanced: true,
      default: false,
    },
    { key: "labelIDs", label: "Labels", type: "string", repeat: true, advanced: true },
    {
      key: "postIDs",
      label: "Linked posts",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "Posts to link to this changelog entry.",
    },
  ],
  output: entryOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post<{ id: string }>("/entries/create", {
      title: input.title,
      details: input.details,
      type: input.type,
      notify: input.notify,
      published: input.published,
      publishedOn: input.publishedOn,
      scheduledFor: input.scheduledFor,
      labelIDs: toList(input.labelIDs),
      postIDs: toList(input.postIDs),
    });
  },
};

export default entryCreate;
