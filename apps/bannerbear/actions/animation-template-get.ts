import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface AnimationTemplate {
  uid: string;
  name: string;
  width: number;
  height: number;
  frame_rate?: number;
  duration_seconds?: number;
  config?: { objects?: unknown[] };
}

interface Input {
  uid: string;
}

/**
 * `GET /animation_templates/{uid}` — `config.objects` is every layer on the
 * timeline, with the `name`/`id` an `animation-create` modification targets.
 */
const action: ActionDefinition<Input, AnimationTemplate> = {
  key: "animation-template-get",
  type: "read",
  resource: "animation-template",
  title: "Get Animation Template",
  description:
    "Get an Animation Template, including its full canvas config — the layer names/ids to " +
    "target from animation-create's modifications.",
  params: [
    { key: "uid", label: "Template UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
    { key: "frame_rate", type: "number", label: "Frame rate" },
    { key: "duration_seconds", type: "number", label: "Duration (seconds)" },
    { key: "config", type: "object", label: "Canvas config" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<AnimationTemplate>(
      `/animation_templates/${encodeURIComponent(uid)}`,
    );
  },
};

export default action;
