import { assertEquals } from "@std/assert";
import botInfoGet from "../../actions/bot-info-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bot-info-get: GETs /v2/bot/info and returns the body as-is", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        userId: "Ub9952f8...",
        basicId: "@216ru...",
        displayName: "Example name",
        pictureUrl: "https://profile.line-scdn.net/0hbGgpkVAb...",
        chatMode: "chat",
        markAsReadMode: "manual",
      },
    },
  ]);
  const out = await botInfoGet.execute({}, ctx) as { displayName: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/bot/info");
  assertEquals(out.displayName, "Example name");
});

Deno.test("bot-info-get: requires no auth-opt-out (auth is the default posture)", () => {
  assertEquals(botInfoGet.requiresAuth, undefined);
});
