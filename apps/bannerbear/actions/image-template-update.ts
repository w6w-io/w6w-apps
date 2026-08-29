import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BannerbearClient, compact, toList } from "../lib/client.ts";
import { configParam, heightParam, widthParam } from "../lib/params.ts";

interface ImageTemplate {
  uid: string;
  name: string;
  width: number;
  height: number;
  config?: { objects?: unknown[] };
}

interface Input {
  uid: string;
  name?: string;
  description?: string;
  tags?: string;
  width?: number;
  height?: number;
  config?: unknown;
}

/**
 * `PATCH /image_templates/{uid}`. A 423 means the template's
 * `api_write_access` is `nobody` — the owner must unlock it in the dashboard;
 * a 403 means it is `owner_only` and this key does not own it. `config`, when
 * sent, REPLACES the canvas in place — omit it to leave layers untouched.
 */
const action: ActionDefinition<Input, ImageTemplate> = {
  key: "image-template-update",
  type: "perform",
  resource: "image-template",
  title: "Update Image Template",
  description:
    "Update an Image Template's metadata and/or canvas config. Idempotent: sending the same " +
    "fields twice leaves the same result.",
  idempotent: true,
  params: [
    { key: "uid", label: "Template UID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
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
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");

    return await new BannerbearClient(ctx).json<ImageTemplate>(
      `/image_templates/${encodeURIComponent(uid)}`,
      {
        method: "PATCH",
        body: compact({
          name: input.name,
          description: input.description,
          tags: toList(input.tags),
          width: input.width,
          height: input.height,
          config: asOptionalJson(input.config, "config"),
        }),
      },
    );
  },
};

export default action;
