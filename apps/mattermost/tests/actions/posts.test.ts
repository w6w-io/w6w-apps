import { assertEquals, assertRejects } from "@std/assert";
import postCreate from "../../actions/post-create.ts";
import postGet from "../../actions/post-get.ts";
import postUpdate from "../../actions/post-update.ts";
import postDelete from "../../actions/post-delete.ts";
import postsForChannel from "../../actions/posts-for-channel.ts";
import postThread from "../../actions/post-thread.ts";
import postSearch from "../../actions/post-search.ts";
import { mockMattermostCtx, postList } from "../_helpers.ts";

Deno.test("post-create: posts the required pair and drops what was left blank", async () => {
  const { ctx, calls } = mockMattermostCtx([{ status: 201, body: { id: "p1" } }]);
  await postCreate.execute({ channelId: "c1", message: "hello", rootId: "" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/posts");
  assertEquals(JSON.parse(calls[0].body!), { channel_id: "c1", message: "hello" });
});

Deno.test("post-create: a root id makes it a threaded reply", async () => {
  const { ctx, calls } = mockMattermostCtx([{ status: 201, body: { id: "p2" } }]);
  await postCreate.execute({ channelId: "c1", message: "re", rootId: "p1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).root_id, "p1");
});

Deno.test("post-create: file ids are sent as an array, however they were typed", async () => {
  const { ctx, calls } = mockMattermostCtx([{ status: 201, body: { id: "p1" } }]);
  await postCreate.execute({ channelId: "c1", message: "x", fileIds: "f1, f2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).file_ids, ["f1", "f2"]);
});

/**
 * Priority is nested two levels deep in the vendor's schema —
 * metadata.priority.priority. A bare string is a 400.
 */
Deno.test("post-create: priority is nested under metadata.priority", async () => {
  const { ctx, calls } = mockMattermostCtx([{ status: 201, body: { id: "p1" } }]);
  await postCreate.execute({ channelId: "c1", message: "x", priority: "urgent" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).metadata, { priority: { priority: "urgent" } });
});

Deno.test("post-create: is honestly not idempotent", () => {
  assertEquals(postCreate.idempotent, false);
});

Deno.test("post-create: names bad props JSON rather than sending it", async () => {
  const { ctx } = mockMattermostCtx([]);
  await assertRejects(
    async () => {
      await postCreate.execute({ channelId: "c1", message: "x", props: "{nope" }, ctx);
    },
    Error,
    "Props is not valid JSON",
  );
});

Deno.test("post-get: builds the post path", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: { id: "p1" } }]);
  await postGet.execute({ postId: "p1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/posts/p1");
});

/**
 * The load-bearing choice: `/patch` applies only the fields sent, while the bare
 * `PUT /posts/{id}` replaces the post and would blank its files and props.
 */
Deno.test("post-update: PUTs to /patch, not to the replacing endpoint", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: { id: "p1" } }]);
  await postUpdate.execute({ postId: "p1", message: "edited" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/posts/p1/patch");
  assertEquals(JSON.parse(calls[0].body!), { message: "edited" });
});

/** `false` must survive `compact` — it is how a post is un-pinned. */
Deno.test("post-update: an explicit false is sent, so unpinning is expressible", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: { id: "p1" } }]);
  await postUpdate.execute({ postId: "p1", isPinned: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { is_pinned: false });
});

Deno.test("post-delete: DELETEs the post path", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: { status: "OK" } }]);
  await postDelete.execute({ postId: "p1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/posts/p1");
});

Deno.test("posts-for-channel: maps the paging and cursor parameters", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: postList(["p1", "p2"]) }]);
  await postsForChannel.execute(
    { channelId: "c1", page: 1, perPage: 50, since: 1700000000000 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v4/channels/c1/posts");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("since"), "1700000000000");
});

/**
 * The envelope must survive intact. `order` is the only thing that carries the
 * display order — flattening `posts` to an array silently loses it.
 */
Deno.test("posts-for-channel: returns the {order, posts} envelope, not a flattened array", async () => {
  const { ctx } = mockMattermostCtx([{ body: postList(["p3", "p1", "p2"]) }]);
  const out = await postsForChannel.execute({ channelId: "c1" }, ctx) as {
    order: string[];
    posts: Record<string, unknown>;
  };
  assertEquals(out.order, ["p3", "p1", "p2"]);
  assertEquals(Object.keys(out.posts).sort(), ["p1", "p2", "p3"]);
});

Deno.test("post-thread: builds the thread path with its camelCase query params", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: postList(["p1"]) }]);
  await postThread.execute({ postId: "p1", perPage: 20, direction: "down" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v4/posts/p1/thread");
  // Mattermost really does use camelCase here, unlike its snake_case siblings.
  assertEquals(url.searchParams.get("perPage"), "20");
  assertEquals(url.searchParams.get("direction"), "down");
});

/**
 * `is_or_search` is required by the schema with no server default, so it must
 * always be on the wire — including when it is `false`, which `compact` would
 * otherwise drop.
 */
Deno.test("post-search: always sends is_or_search, defaulting to AND", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: postList([]) }, { body: postList([]) }]);
  await postSearch.execute({ teamId: "t1", terms: "deploy in:town-square" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/teams/t1/posts/search");
  assertEquals(JSON.parse(calls[0].body!), { terms: "deploy in:town-square", is_or_search: false });
  await postSearch.execute({ teamId: "t1", terms: "a b", isOrSearch: true }, ctx);
  assertEquals(JSON.parse(calls[1].body!).is_or_search, true);
});

Deno.test("post-search: passes the optional paging and timezone fields through", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: postList([]) }]);
  await postSearch.execute({
    teamId: "t1",
    terms: "x",
    includeDeletedChannels: true,
    timeZoneOffset: 3600,
    page: 2,
    perPage: 20,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    terms: "x",
    is_or_search: false,
    include_deleted_channels: true,
    time_zone_offset: 3600,
    page: 2,
    per_page: 20,
  });
});

Deno.test("posts: a Mattermost error surfaces its id", async () => {
  const { ctx } = mockMattermostCtx([{
    status: 403,
    body: {
      id: "api.context.permissions.app_error",
      message: "You do not have the appropriate permissions.",
      status_code: 403,
    },
  }]);
  await assertRejects(
    async () => {
      await postCreate.execute({ channelId: "c1", message: "x" }, ctx);
    },
    Error,
    "api.context.permissions.app_error",
  );
});
