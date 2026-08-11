import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, type ListPage } from "../lib/client.ts";
import {
  capturedRangeParams,
  idFilterParams,
  listOutput,
  pageParams,
  paginationQuery,
} from "../lib/params.ts";

/**
 * `GET /v2/videos` — videos across the company, newest capture first.
 *
 * **`playback_url` is not a playback URL until `status` is `processed`.** The
 * vendor repeats this warning on all three video endpoints: before then the
 * field carries the raw upload URL and `format` carries that file's extension
 * instead of `m3u8`. Anything that pipes `playback_url` straight into a player
 * will work on old videos and fail on new ones, which is the worst way for a
 * bug like this to present.
 *
 * **No cursor pagination.** The vendor's prose says this endpoint "supports the
 * same filtering and pagination parameters as `/photos`", but its own parameter
 * list declares only `page` / `per_page` — no `after`, no `before` — and the
 * `X-Next-Cursor` response headers are declared on the photo endpoints only. An
 * undeclared cursor is exactly the kind of detail that silently returns page
 * one forever, so this action sends only what is documented.
 */
interface Input {
  projectId?: string;
  userId?: string;
  groupId?: string;
  tagId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

const videoList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "video-list",
  type: "search",
  resource: "video",
  title: "List Videos",
  description:
    "List videos across the company. playback_url is only meaningful once status is processed.",
  params: [
    ...idFilterParams([
      { key: "projectId", label: "Project", hint: "Only videos captured at this project." },
      { key: "userId", label: "Captured by user", hint: "Only videos captured by this user." },
      { key: "groupId", label: "Captured by group", hint: "Only videos from this group." },
      { key: "tagId", label: "Tagged with", hint: "Only videos carrying this tag." },
    ]),
    ...capturedRangeParams("videos"),
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list("/videos", {
      query: {
        ...paginationQuery(input),
        start_date: input.startDate,
        end_date: input.endDate,
        project_ids: input.projectId,
        user_ids: input.userId,
        group_ids: input.groupId,
        tag_ids: input.tagId,
      },
    });
  },
};

export default videoList;
