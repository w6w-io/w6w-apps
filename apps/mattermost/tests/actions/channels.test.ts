import { assert, assertEquals, assertRejects } from "@std/assert";
import channelGetByName from "../../actions/channel-get-by-name.ts";
import channelCreate from "../../actions/channel-create.ts";
import channelDirectCreate from "../../actions/channel-direct-create.ts";
import channelMemberAdd from "../../actions/channel-member-add.ts";
import channelMembersList from "../../actions/channel-members-list.ts";
import channelsForUser from "../../actions/channels-for-user.ts";
import { mockMattermostCtx } from "../_helpers.ts";

Deno.test("channel-get-by-name: builds the team-name/channel-name path", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: { id: "c1", display_name: "Town Square" } }]);
  await channelGetByName.execute({ teamName: "acme", channelName: "town-square" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/v4/teams/name/acme/channels/name/town-square",
  );
});

/** Names come from a URL, so they may contain characters that need encoding. */
Deno.test("channel-get-by-name: percent-encodes both names", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: { id: "c1" } }]);
  await channelGetByName.execute({ teamName: "a/b", channelName: "c d" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/teams/name/a%2Fb/channels/name/c%20d");
});

Deno.test("channel-create: posts the four required fields", async () => {
  const { ctx, calls } = mockMattermostCtx([{ status: 201, body: { id: "c1" } }]);
  await channelCreate.execute({
    teamId: "t1",
    name: "release-planning",
    displayName: "Release Planning",
    type: "P",
    purpose: "",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    team_id: "t1",
    name: "release-planning",
    display_name: "Release Planning",
    type: "P",
  });
});

Deno.test("channel-create: offers only the two creatable types", () => {
  const type = channelCreate.params!.find((p) => p.key === "type")!;
  assertEquals((type.options as Array<{ value: string }>).map((o) => o.value), ["O", "P"]);
  assertEquals(channelCreate.idempotent, false);
});

/**
 * The load-bearing shape: this endpoint's body is a BARE ARRAY of exactly two
 * ids. Sending `{"user_ids": [...]}` is a 400.
 */
Deno.test("channel-direct-create: sends a bare two-element array, not an object", async () => {
  const { ctx, calls } = mockMattermostCtx([{ status: 201, body: { id: "d1", type: "D" } }]);
  await channelDirectCreate.execute({ userIds: "u1, u2" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/channels/direct");
  assertEquals(JSON.parse(calls[0].body!), ["u1", "u2"]);
});

Deno.test("channel-direct-create: refuses anything but two ids, before sending", async () => {
  const { ctx, calls } = mockMattermostCtx([]);
  await assertRejects(
    async () => {
      await channelDirectCreate.execute({ userIds: "u1" }, ctx);
    },
    Error,
    "exactly two ids",
  );
  await assertRejects(
    async () => {
      await channelDirectCreate.execute({ userIds: "u1,u2,u3" }, ctx);
    },
    Error,
    "exactly two ids",
  );
  assertEquals(calls.length, 0, "nothing should have been sent");
});

/** A DM channel is a singleton, so calling this repeatedly is safe. */
Deno.test("channel-direct-create: is idempotent, because the channel is a singleton", () => {
  assertEquals(channelDirectCreate.idempotent, true);
});

Deno.test("channel-member-add: posts the user id to the members path", async () => {
  const { ctx, calls } = mockMattermostCtx([{
    status: 201,
    body: { channel_id: "c1", user_id: "u2" },
  }]);
  await channelMemberAdd.execute({ channelId: "c1", userId: "u2" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/channels/c1/members");
  assertEquals(JSON.parse(calls[0].body!), { user_id: "u2" });
});

Deno.test("channel-members-list: pages the members path", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: [] }]);
  await channelMembersList.execute({ channelId: "c1", page: 1, perPage: 100 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v4/channels/c1/members");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("per_page"), "100");
});

/**
 * `me` is Mattermost's alias for the authenticated user, and defaulting to it
 * saves a lookup for the question a workflow usually asks.
 */
Deno.test("channels-for-user: defaults the user to `me`", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: [] }, { body: [] }]);
  await channelsForUser.execute({ teamId: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/users/me/teams/t1/channels");
  await channelsForUser.execute({ teamId: "t1", userId: "u9" }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/api/v4/users/u9/teams/t1/channels");
});

Deno.test("channels-for-user: a blank user id still means me", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: [] }]);
  await channelsForUser.execute({ teamId: "t1", userId: "  " }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/users/me/teams/t1/channels");
});

Deno.test("channels: a missing channel surfaces Mattermost's store error id", async () => {
  const { ctx } = mockMattermostCtx([{
    status: 404,
    body: {
      id: "store.sql_channel.get_by_name.missing.app_error",
      message: "Unable to find the existing channel.",
      status_code: 404,
    },
  }]);
  const err = await assertRejects(async () => {
    await channelGetByName.execute({ teamName: "acme", channelName: "nope" }, ctx);
  }, Error);
  assert(err.message.includes("store.sql_channel.get_by_name.missing.app_error"), err.message);
});
