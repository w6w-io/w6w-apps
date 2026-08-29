import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface Publication {
  uid: string;
  name: string;
  description?: string | null;
  tags?: string[];
  visibility?: "unpublished" | "published" | "public_library";
  preview?: string | null;
  install_count?: number;
  template_kind?: "image";
}

interface Input {
  uid: string;
}

/** `GET /publications/{uid}`. */
const action: ActionDefinition<Input, Publication> = {
  key: "publication-get",
  type: "read",
  resource: "publication",
  title: "Get Publication",
  description: "Get a template-library publication.",
  params: [
    { key: "uid", label: "Publication UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "install_count", type: "number", label: "Install count" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<Publication>(
      `/publications/${encodeURIComponent(uid)}`,
    );
  },
};

export default action;
