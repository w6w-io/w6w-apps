import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import {
  capturedRangeParams,
  idFilterParams,
  listOutput,
  pageParams,
  paginationQuery,
} from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/videos` — videos captured at one project.
 *
 * **`playback_url` lies until `status` is `processed`.** The vendor says so on
 * every video endpoint: before processing finishes, `playback_url` is the raw
 * upload URL and `format` is that file's extension rather than the HLS
 * manifest and `m3u8`. A workflow that hands `playback_url` to a player the
 * moment a video appears will hand it something unplayable. Filter on
 * `status == "processed"`, or subscribe to the `video.updated` webhook.
 *
 * No cursor pagination here. The vendor's prose says the video endpoints
 * "support the same filtering and pagination parameters as `/photos`", but the
 * parameter list on this operation declares no `after`/`before`, so this action
 * does not send them — see the README.
 */
interface Input {
  projectId: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  groupId?: string;
  tagId?: string;
  page?: number;
  perPage?: number;
}

const projectVideoList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-video-list",
  type: "search",
  resource: "video",
  title: "List Project Videos",
  description:
    "List the videos captured at a project. Treat playback_url as valid only once status is " +
    "processed.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    ...capturedRangeParams("videos"),
    ...idFilterParams([
      { key: "userId", label: "Captured by user", hint: "Only videos captured by this user." },
      { key: "groupId", label: "Captured by group", hint: "Only videos from this group." },
      { key: "tagId", label: "Tagged with", hint: "Only videos carrying this tag." },
    ]),
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/videos`,
      {
        query: {
          ...paginationQuery(input),
          start_date: input.startDate,
          end_date: input.endDate,
          user_ids: input.userId,
          group_ids: input.groupId,
          tag_ids: input.tagId,
        },
      },
    );
  },
};

export default projectVideoList;
