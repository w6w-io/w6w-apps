import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient, toIdList } from "../lib/client.ts";

interface Input {
  name: string;
  organization: string;
  color?: string;
  parent?: string;
  shareWithOrganization?: boolean;
  shareWithTeam?: string;
  shareWithUsers?: string;
  visibility?: "organization" | "delegates";
}

/**
 * `POST /v1/shared_labels` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Shared labels,
 * 2026-08-29.
 */
const action: ActionDefinition<Input> = {
  key: "shared-label-create",
  type: "perform",
  resource: "shared-label",
  title: "Create Shared Label",
  description: "Create a shared label in an organization.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "organization", label: "Organization ID", type: "string", required: true },
    { key: "color", label: "Color (HEX)", type: "string", default: "" },
    { key: "parent", label: "Parent Label ID", type: "string", default: "", advanced: true },
    {
      key: "shareWithOrganization",
      label: "Share With Organization",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Everyone with access sees all conversations in this label.",
    },
    {
      key: "shareWithTeam",
      label: "Share With Team ID",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "shareWithUsers",
      label: "Share With Users (comma-separated IDs)",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      default: "organization",
      advanced: true,
      options: [
        { value: "organization", label: "Everyone in the organization" },
        { value: "delegates", label: "Admins and auto-shared users only" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Shared Label ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "name_with_parent_names", type: "string", label: "Full path (parent/child)" },
  ],

  async execute(input, ctx) {
    if (!input.name) throw new Error("`name` is required");
    if (!input.organization) throw new Error("`organization` is required");

    const label = compact({
      name: input.name,
      organization: input.organization,
      color: input.color,
      parent: input.parent,
      share_with_organization: input.shareWithOrganization === true ? true : undefined,
      share_with_team: input.shareWithTeam,
      share_with_users: toIdList(input.shareWithUsers).length
        ? toIdList(input.shareWithUsers)
        : undefined,
      visibility: input.visibility,
    });

    ctx.log("info", "creating Missive shared label", { name: input.name });
    const res = await new MissiveClient(ctx).json<{ shared_labels: unknown[] }>("/shared_labels", {
      method: "POST",
      body: { shared_labels: [label] },
    });
    return res.shared_labels[0];
  },
};

export default action;
