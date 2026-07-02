import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-role.ts";

Deno.test("create-role: POSTs /guilds/{id}/roles with an empty body when nothing supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1" } }]);
  await action.execute!({ guildId: "g1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/guilds/g1/roles");
  assertEquals(calls[0].body, "{}");
});

Deno.test("create-role: forwards only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1" } }]);
  await action.execute!(
    {
      guildId: "g1",
      name: "Mods",
      permissions: "8",
      color: 16711680,
      hoist: true,
      mentionable: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Mods");
  assertEquals(body.permissions, "8");
  assertEquals(body.color, 16711680);
  assertEquals(body.hoist, true);
  assertEquals(body.mentionable, true);
});

Deno.test("create-role: omits undefined optional fields entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1" } }]);
  await action.execute!({ guildId: "g1", name: "Mods" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Mods");
  assert(!("permissions" in body));
  assert(!("color" in body));
  assert(!("hoist" in body));
});
