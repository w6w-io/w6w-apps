import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";

interface Input {
  calendarId: string;
  name?: string;
  slug?: string;
  description?: string;
  avatarUrl?: string;
  tintColor?: string;
}

/** `POST /v1/calendars/update`. */
const calendarUpdate: ActionDefinition<Input> = {
  key: "calendar-update",
  type: "perform",
  resource: "calendar",
  title: "Update Calendar",
  description: "Update the connected calendar's name, slug, description, avatar or accent color.",
  idempotent: true,
  params: [
    {
      key: "calendarId",
      label: "Calendar",
      type: "string",
      required: true,
      placeholder: "cal-abc123",
      hint: "Calendar ID, usually starting with `cal-`.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      hint: "URL slug for the calendar page, e.g. `my-community` -> lu.ma/my-community.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "avatarUrl",
      label: "Avatar URL",
      type: "string",
      hint: "Must be an image already uploaded to the Luma CDN.",
    },
    {
      key: "tintColor",
      label: "Tint color",
      type: "string",
      placeholder: "#E3CBEF",
      hint: "Hex color, e.g. #E3CBEF.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).json("/v1/calendars/update", {
      method: "POST",
      body: compact({
        calendar_id: input.calendarId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        avatar_url: input.avatarUrl,
        tint_color: input.tintColor,
      }),
    });
  },
};

export default calendarUpdate;
