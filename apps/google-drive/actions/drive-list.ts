import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  q?: string;
  pageSize?: number;
  pageToken?: string;
  useDomainAdminAccess?: boolean;
}

const listDrives: ActionDefinition<Input> = {
  key: "drive-list",
  type: "search",
  resource: "drive",
  title: "List Shared Drives",
  description: "List shared drives visible to the caller (one page).",
  params: [
    { key: "q", label: "Query", type: "string" },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "pageToken", label: "Page token", type: "string" },
    { key: "useDomainAdminAccess", label: "Use domain admin access", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    return client.request("/drives", {
      query: {
        q: input.q,
        pageSize: input.pageSize ?? 100,
        pageToken: input.pageToken,
        useDomainAdminAccess: input.useDomainAdminAccess,
      },
    });
  },
};

export default listDrives;
