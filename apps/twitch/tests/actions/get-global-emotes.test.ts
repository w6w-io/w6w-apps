import { assertEquals } from "@std/assert";
import getGlobalEmotes from "../../actions/get-global-emotes.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-global-emotes: calls GET /helix/chat/emotes/global with no query at all", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ id: "196892", name: "TwitchUnity" }],
      template:
        "https://static-cdn.jtvnw.net/emoticons/v2/{{id}}/{{format}}/{{theme_mode}}/{{scale}}",
    },
  }]);
  const out = await getGlobalEmotes.execute({}, ctx) as { template: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/helix/chat/emotes/global");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.template.includes("{{id}}"), true);
});

Deno.test("get-global-emotes: declares no params, matching the reference", () => {
  assertEquals(getGlobalEmotes.params, []);
});
