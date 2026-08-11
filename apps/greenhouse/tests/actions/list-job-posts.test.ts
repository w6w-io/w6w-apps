import { assert, assertEquals, assertThrows } from "@std/assert";
import listJobPosts from "../../actions/list-job-posts.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-job-posts: calls GET /v3/job_posts", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listJobPosts.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/job_posts");
});

/**
 * `active`, `live` and `internal` are three independent booleans rather than one
 * state, and `false` has to survive: a post that is active but not live is a
 * real, distinct thing.
 */
Deno.test("list-job-posts: the three visibility booleans are sent independently, false included", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listJobPosts.execute({
    jobIds: "1,2",
    jobBoardIds: "3",
    active: true,
    live: false,
    internal: false,
    featured: true,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    job_ids: "1,2",
    job_board_ids: "3",
    active: "true",
    live: "false",
    internal: "false",
    featured: "true",
  });
});

Deno.test("list-job-posts: an omitted boolean is not sent at all", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listJobPosts.execute({ jobIds: "1" }, ctx);
  assertEquals(queryOf(calls[0].url), { job_ids: "1" });
});

Deno.test("list-job-posts: a cursor rejects the job filter it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(() => listJobPosts.execute({ cursor: "N", jobIds: "1" }, ctx), Error);
  assert(err.message.includes("job_ids"), err.message);
});
