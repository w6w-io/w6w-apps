import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient, toIdList } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  color?: string;
  parent?: string;
  visibility?: "organization" | "delegates";
  shareWithOrganization?: boolean;
  shareWithTeam?: string;
  shareWithUsers?: string;
}

/**
 * `PATCH /v1/shared_labels/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Shared labels,
 * 2026-08-29.
 *
 * Basic users may update `name`, `color`, and `parent`; `visibility`,
 * `shareWithOrganization`, `shareWithTeam`, and `shareWithUsers` additionally
 * require an admin/owner token.
 */
const action: ActionDefinition<Input> = {
  key: "shared-label-update",
  type: "perform",
  resource: "shared-label",
  title: "Update Shared Label",
  description: "Update a shared label. Visibility and sharing fields require an admin/owner " +
    "token; name/color/parent do not.",
  idempotent: true,
  params: [
    { key: "id", label: "Shared Label ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "color", label: "Color (HEX)", type: "string", default: "" },
    { key: "parent", label: "Parent Label ID", type: "string", default: "", advanced: true },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "organization", label: "Everyone in the organization" },
        { value: "delegates", label: "Admins and auto-shared users only" },
      ],
      hint: "Admin/owner token required.",
    },
    {
      key: "shareWithOrganization",
      label: "Share With Organization",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Admin/owner token required.",
    },
    {
      key: "shareWithTeam",
      label: "Share With Team ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Admin/owner token required.",
    },
    {
      key: "shareWithUsers",
      label: "Share With Users (comma-separated IDs)",
      type: "string",
      default: "",
      advanced: true,
      hint: "Admin/owner token required.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Shared Label ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");

    const label = compact({
      id: input.id,
      name: input.name,
      color: input.color,
      parent: input.parent,
      visibility: input.visibility,
      share_with_organization: input.shareWithOrganization === true ? true : undefined,
      share_with_team: input.shareWithTeam,
      share_with_users: toIdList(input.shareWithUsers).length
        ? toIdList(input.shareWithUsers)
        : undefined,
    });

    ctx.log("info", "updating Missive shared label", { id: input.id });
    const res = await new MissiveClient(ctx).json<{ shared_labels: unknown[] }>(
      `/shared_labels/${encodeURIComponent(input.id)}`,
      { method: "PATCH", body: { shared_labels: [label] } },
    );
    return res.shared_labels[0];
  },
};

export default action;
