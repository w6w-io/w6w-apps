import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /content_blocks/create` — verified against the fetched spec. Not
 * idempotent: Content Block names must be unique, so a retry with the same
 * name fails rather than upserting.
 */
const action: ActionDefinition = {
  key: "content-block-create",
  type: "perform",
  resource: "content-block",
  title: "Create Content Block",
  description: "Create a reusable HTML/text Content Block.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "Under 100 characters." },
    { key: "description", label: "Description", type: "string", hint: "Under 250 characters." },
    { key: "content", label: "Content", type: "text", required: true },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active" },
        { value: "draft", label: "Draft" },
      ],
    },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "Tags must already exist in the workspace.",
    },
  ],
  output: [
    { key: "contentBlockId", type: "string", label: "Content Block ID" },
  ],

  async execute(input, ctx) {
    const p = input as {
      name: string;
      description?: string;
      content: string;
      state?: string;
      tags?: string[];
    };
    ctx.log("info", "creating Braze Content Block", { name: p.name });
    return await new BrazeClient(ctx).post("/content_blocks/create", {
      name: p.name,
      description: p.description || undefined,
      content: p.content,
      state: p.state || undefined,
      tags: p.tags?.length ? p.tags : undefined,
    });
  },
};

export default action;
