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
  uid: string;
  name?: string;
  description?: string;
  tags?: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

/**
 * `PATCH /animation_templates/{uid}`. Same absence as the create action: no
 * `config` field — layers/timeline are dashboard-only.
 */
const action: ActionDefinition<Input, AnimationTemplate> = {
  key: "animation-template-update",
  type: "perform",
  resource: "animation-template",
  title: "Update Animation Template",
  description: "Update an Animation Template's name, description, tags, size, or frame rate.",
  idempotent: true,
  params: [
    { key: "uid", label: "Template UID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
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
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");

    return await new BannerbearClient(ctx).json<AnimationTemplate>(
      `/animation_templates/${encodeURIComponent(uid)}`,
      {
        method: "PATCH",
        body: compact({
          name: input.name,
          description: input.description,
          tags: toList(input.tags),
          width: input.width,
          height: input.height,
          frame_rate: input.frameRate,
        }),
      },
    );
  },
};

export default action;
