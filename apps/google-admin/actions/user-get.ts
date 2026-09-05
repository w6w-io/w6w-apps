import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  userKey: string;
  projection?: string;
  viewType?: string;
}

const getUser: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieve a user by email address, alias, or unique ID.",
  params: [
    {
      key: "userKey",
      label: "User Key",
      type: "string",
      required: true,
      hint: "Email, alias, or user ID.",
    },
    {
      key: "projection",
      label: "Projection",
      type: "select",
      options: [
        { value: "basic", label: "Basic" },
        { value: "custom", label: "Custom" },
        { value: "full", label: "Full" },
      ],
      default: "basic",
    },
    {
      key: "viewType",
      label: "View type",
      type: "select",
      options: [
        { value: "admin_view", label: "Admin view" },
        { value: "domain_public", label: "Domain public view" },
      ],
      default: "admin_view",
    },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    return client.request(`/users/${encodeURIComponent(input.userKey)}`, {
      query: {
        projection: input.projection ?? "basic",
        viewType: input.viewType ?? "admin_view",
      },
    });
  },
};

export default getUser;
