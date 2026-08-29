import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BannerbearClient, compact, toList } from "../lib/client.ts";
import { configParam, heightParam, widthParam } from "../lib/params.ts";

interface ImageTemplate {
  uid: string;
  name: string;
  width: number;
  height: number;
  config?: { objects?: unknown[] };
  created_at?: string;
}

interface Input {
  name: string;
  description?: string;
  tags?: string;
  width?: number;
  height?: number;
  config?: unknown;
}

/**
 * `POST /image_templates` — create an Image Template from a canvas config.
 * `name` is the only required field; a template with no `config` is created
 * empty (editable afterwards in the Bannerbear dashboard).
 */
const action: ActionDefinition<Input, ImageTemplate> = {
  key: "image-template-create",
  type: "perform",
  resource: "image-template",
  title: "Create Image Template",
  description: "Create an Image Template. Not idempotent — every call creates a new template.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    widthParam,
    heightParam,
    configParam,
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    return await new BannerbearClient(ctx).json<ImageTemplate>("/image_templates", {
      method: "POST",
      body: compact({
        name,
        description: input.description,
        tags: toList(input.tags),
        width: input.width,
        height: input.height,
        config: asOptionalJson(input.config, "config"),
      }),
    });
  },
};

export default action;
