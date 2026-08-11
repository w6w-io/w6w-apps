import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import {
  capturedRangeParams,
  cursorOutput,
  cursorParams,
  idFilterParams,
  listOutput,
  pageParams,
  paginationQuery,
} from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/photos` — photos captured at one project.
 *
 * One of only two endpoints in this API with **cursor pagination**, and the
 * cursors are not in the body: the response is a bare JSON array, and
 * `X-Next-Cursor` / `X-Prev-Cursor` / `X-Has-Next` / `X-Has-Prev` arrive as
 * headers. This action surfaces them as outputs, so paging a large project is
 * `after: {{previous.nextCursor}}` rather than counting pages.
 *
 * Prefer the cursor over `page` for anything long-running: photos are added
 * while you page, and offset pagination over a growing collection silently
 * skips rows.
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
  after?: string;
  before?: string;
}

const projectPhotoList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-photo-list",
  type: "search",
  resource: "photo",
  title: "List Project Photos",
  description: "List the photos captured at a project, with cursor pagination.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    ...capturedRangeParams("photos"),
    ...idFilterParams([
      { key: "userId", label: "Captured by user", hint: "Only photos captured by this user." },
      {
        key: "groupId",
        label: "Captured by group",
        hint: "Only photos captured by users in this group.",
      },
      { key: "tagId", label: "Tagged with", hint: "Only photos carrying this tag." },
    ]),
    ...pageParams(),
    ...cursorParams(),
  ],
  output: [...listOutput, ...cursorOutput],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/photos`,
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

export default projectPhotoList;
