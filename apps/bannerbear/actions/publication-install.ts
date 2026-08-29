import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface ImageTemplate {
  uid: string;
  name: string;
  width: number;
  height: number;
}

interface Input {
  uid: string;
}

/**
 * `POST /publications/{uid}/install` — clone a publication's snapshot into
 * this workspace as a new Image Template. Trial accounts are capped at 3
 * templates; installing beyond the cap returns 402. Not idempotent: each
 * call installs another copy.
 */
const action: ActionDefinition<Input, ImageTemplate> = {
  key: "publication-install",
  type: "perform",
  resource: "publication",
  title: "Install Publication",
  description:
    "Install a publication into this workspace as a new Image Template. Not idempotent — each " +
    "call installs another copy. Trial accounts are capped at 3 templates.",
  idempotent: false,
  params: [
    { key: "uid", label: "Publication UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "New template UID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<ImageTemplate>(
      `/publications/${encodeURIComponent(uid)}/install`,
      { method: "POST" },
    );
  },
};

export default action;
