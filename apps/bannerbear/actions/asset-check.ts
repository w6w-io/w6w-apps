import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient, toList } from "../lib/client.ts";

interface Asset {
  uid: string;
  url: string;
  mime_type?: string | null;
  size?: number;
  created_at?: string;
}

interface Input {
  contentHashes: string;
}

/**
 * `POST /assets/check` — look up up to 100 SHA-256 content hashes at once and
 * learn which are already uploaded, without uploading anything. Answers a map
 * of `hash -> asset or null`, so a workflow can skip re-uploading files it
 * already has an asset for.
 */
const action: ActionDefinition<Input, Record<string, Asset | null>> = {
  key: "asset-check",
  type: "read",
  resource: "asset",
  title: "Check Assets by Hash",
  description: "Check up to 100 SHA-256 content hashes against already-uploaded assets, to skip " +
    "re-uploading files the workspace already has.",
  params: [
    {
      key: "contentHashes",
      label: "Content hashes (SHA-256)",
      type: "text",
      required: true,
      hint: "Comma-separated SHA-256 hex digests of the file contents, up to 100.",
    },
  ],
  output: [{ key: "results", type: "object", label: "hash -> asset or null" }],

  async execute(input, ctx) {
    const hashes = toList(input.contentHashes);
    if (!hashes || hashes.length === 0) {
      throw new Error("`contentHashes` must contain at least one SHA-256 hash");
    }
    if (hashes.length > 100) throw new Error("`contentHashes` accepts at most 100 hashes");

    return await new BannerbearClient(ctx).json<Record<string, Asset | null>>("/assets/check", {
      method: "POST",
      body: { content_hashes: hashes },
    });
  },
};

export default action;
