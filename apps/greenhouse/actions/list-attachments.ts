import type { ActionDefinition } from "@w6w/types";
import { buildListQuery, HarvestClient, type HarvestPage, idList } from "../lib/client.ts";
import { type BaseListInput, baseListQuery } from "../lib/list.ts";
import {
  attachmentTypeOptions,
  createdAtParams,
  fieldsParam,
  idsParam,
  listOutput,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/attachments` — résumés, cover letters, offer packets and the rest.
 *
 * **The `url` on each row expires.** Greenhouse hosts attachments on S3 and
 * hands out signed, temporary links; its own general-considerations note says
 * "URLs to external resources are valid for 7 days" and that users "should
 * download these documents immediately after the request is made and should not
 * rely on these URLs to be available for future requests". Storing one in a
 * database and following it next month gets an S3 error, not a file — and the
 * same note warns that attachments are simply unavailable while S3 is having a
 * bad day, which is why `health/service.ts` reports the AWS S3 components the
 * status page publishes rather than filtering them out as noise.
 *
 * This action does not download anything. It returns metadata and the signed
 * link; fetching the bytes is a separate step, and one that should happen
 * immediately.
 */
interface Input extends BaseListInput {
  applicationIds?: string;
  candidateIds?: string;
  type?: string;
}

const listAttachments: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-attachments",
  type: "search",
  resource: "candidate",
  title: "List Attachments",
  description:
    "List candidate and application attachments. The returned URLs are signed and short-lived.",
  params: [
    { key: "candidateIds", label: "Candidate ids", type: "string", hint: "Comma-separated." },
    {
      key: "applicationIds",
      label: "Application ids",
      type: "string",
      hint: "Comma-separated. Attachments live at both levels — candidate-wide documents and " +
        "ones attached to a single application.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: attachmentTypeOptions,
      hint: "Filter to `resume` for the common case.",
    },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Attachments"),

  execute(input, ctx) {
    ctx.log(
      "info",
      "attachment URLs are signed and temporary — download immediately, do not store the link",
    );
    return new HarvestClient(ctx).list("/attachments", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        application_ids: idList(input.applicationIds, "applicationIds"),
        candidate_ids: idList(input.candidateIds, "candidateIds"),
        type: input.type,
      }),
    });
  },
};

export default listAttachments;
