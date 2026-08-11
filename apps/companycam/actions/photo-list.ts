import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, type ListPage } from "../lib/client.ts";
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
 * `GET /v2/photos` — every photo this credential can see, newest capture first.
 *
 * The company-wide counterpart of `project-photo-list`, and the other endpoint
 * with **cursor pagination**: `after` / `before` in, `X-Next-Cursor` /
 * `X-Prev-Cursor` / `X-Has-Next` / `X-Has-Prev` back as headers, surfaced here
 * as outputs. Page with cursors, not `page`: a company adds photos while you
 * read, and offset pagination over a growing collection skips rows.
 *
 * `start_date` / `end_date` filter on **capture time**, not upload time, so a
 * daily sync keyed on "captured yesterday" misses a photo taken yesterday and
 * uploaded when the crew got back into signal. Filter on a window wide enough
 * to cover that, or drive the sync from the `photo.created` webhook.
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
  after?: string;
  before?: string;
}

const photoList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "photo-list",
  type: "search",
  resource: "photo",
  title: "List Photos",
  description:
    "List photos across the company, filtered by capture window, project, user, group or tag.",
  params: [
    ...idFilterParams([
      { key: "projectId", label: "Project", hint: "Only photos from this project." },
      { key: "userId", label: "Captured by user", hint: "Only photos captured by this user." },
      {
        key: "groupId",
        label: "Captured by group",
        hint: "Only photos captured by users in this group.",
      },
      { key: "tagId", label: "Tagged with", hint: "Only photos carrying this tag." },
    ]),
    ...capturedRangeParams("photos"),
    ...pageParams(),
    ...cursorParams(),
  ],
  output: [...listOutput, ...cursorOutput],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list("/photos", {
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

export default photoList;
