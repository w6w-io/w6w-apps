import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient, compact, toList } from "../lib/client.ts";
import { frameRateParam, heightParam, widthParam } from "../lib/params.ts";

interface AnimationTemplate {
  uid: string;
  name: string;
  width?: number;
  height?: number;
  frame_rate?: number;
}

interface Input {
  name: string;
  description?: string;
  tags?: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

/**
 * `POST /animation_templates` — create an Animation Template shell.
 *
 * Unlike `image-template-create`, there is no `config` field here: the
 * OpenAPI document's create AND update schemas for this resource both omit
 * `config` entirely (verified by diffing the two request bodies against
 * `image_templates`' equivalents on 2026-08-29) — the timeline/layers of an
 * Animation Template can only be authored in the Bannerbear dashboard editor,
 * never via this API. This action creates the template's metadata and canvas
 * size; building its layers is a manual step afterwards.
 */
const action: ActionDefinition<Input, AnimationTemplate> = {
  key: "animation-template-create",
  type: "perform",
  resource: "animation-template",
  title: "Create Animation Template",
  description:
    "Create an Animation Template's metadata and canvas size. Its layers/timeline can only be " +
    "authored in the Bannerbear dashboard — not idempotent, every call creates a new template.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    widthParam,
    heightParam,
    frameRateParam,
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    return await new BannerbearClient(ctx).json<AnimationTemplate>("/animation_templates", {
      method: "POST",
      body: compact({
        name,
        description: input.description,
        tags: toList(input.tags),
        width: input.width,
        height: input.height,
        frame_rate: input.frameRate,
      }),
    });
  },
};

export default action;
