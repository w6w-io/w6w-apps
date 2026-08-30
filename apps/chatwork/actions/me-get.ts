import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";

/**
 * `GET /me` — the connected account's own profile.
 *
 * Confirmed against the vendor's schema: this does not return the API token
 * or any other credential material, unlike some vendors' whoami endpoints.
 * `plan`, `email` and `profile` fields are documented as present here (this
 * endpoint has no "inside a run" carve-out the way Apify's does).
 */
const meGet: ActionDefinition<Record<string, never>> = {
  key: "me-get",
  type: "read",
  resource: "profile",
  title: "Get My Profile",
  description: "Fetch the connected Chatwork account's own profile.",
  params: [],
  output: [
    { key: "account_id", type: "number", label: "Account ID" },
    { key: "room_id", type: "number", label: "My Chat room ID" },
    { key: "name", type: "string", label: "Display name" },
    { key: "chatwork_id", type: "string", label: "Chatwork ID" },
    { key: "organization_id", type: "number", label: "Organization ID" },
    { key: "organization_name", type: "string", label: "Organization name" },
    { key: "department", type: "string", label: "Department" },
    { key: "title", type: "string", label: "Job title" },
    { key: "url", type: "string", label: "Profile URL" },
    { key: "introduction", type: "string", label: "Self introduction" },
    { key: "mail", type: "string", label: "Email address" },
    { key: "tel_organization", type: "string", label: "Phone (office)" },
    { key: "tel_extension", type: "string", label: "Phone (extension)" },
    { key: "tel_mobile", type: "string", label: "Phone (mobile)" },
    { key: "skype", type: "string", label: "Skype" },
    { key: "facebook", type: "string", label: "Facebook" },
    { key: "twitter", type: "string", label: "Twitter" },
    { key: "avatar_image_url", type: "string", label: "Avatar image URL" },
    { key: "login_mail", type: "string", label: "Chatwork login email" },
  ],

  execute(_input, ctx) {
    return new ChatworkClient(ctx).json("/me");
  },
};

export default meGet;
