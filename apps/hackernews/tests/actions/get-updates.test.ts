import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-updates.ts";

Deno.test("get-updates: GETs /v0/updates.json and returns items + profiles", async () => {
  const { ctx, calls } = mockCtx([
    { body: { items: [8423305, 8420805], profiles: ["thefox", "mdda"] } },
  ]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/updates.json");
  assertEquals(out.items, [8423305, 8420805]);
  assertEquals(out.profiles, ["thefox", "mdda"]);
});

Deno.test("get-updates: a null body becomes empty items/profiles", async () => {
  const { ctx } = mockCtx([{ body: "null" }]);
  const out = await action.execute({}, ctx);
  assertEquals(out.items, []);
  assertEquals(out.profiles, []);
});
