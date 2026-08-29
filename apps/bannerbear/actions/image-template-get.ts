import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface ImageTemplate {
  uid: string;
  name: string;
  description?: string | null;
  tags?: string[];
  width: number;
  height: number;
  responsive?: boolean;
  preview?: string | null;
  ui_write_access?: string;
  api_write_access?: string;
  config?: { objects?: unknown[] };
  created_at?: string;
}

interface Input {
  uid: string;
}

/**
 * `GET /image_templates/{uid}` — `config.objects` is every layer on the
 * canvas, with the `name`/`id` a `modifications.objects[]` entry addresses.
 */
const action: ActionDefinition<Input, ImageTemplate> = {
  key: "image-template-get",
  type: "read",
  resource: "image-template",
  title: "Get Image Template",
  description:
    "Get an Image Template, including its full canvas config — the layer names/ids to target " +
    "from image-create's modifications.",
  params: [
    { key: "uid", label: "Template UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
    { key: "width", type: "number", label: "Width" },
    { key: "height", type: "number", label: "Height" },
    { key: "config", type: "object", label: "Canvas config" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<ImageTemplate>(
      `/image_templates/${encodeURIComponent(uid)}`,
    );
  },
};

export default action;
