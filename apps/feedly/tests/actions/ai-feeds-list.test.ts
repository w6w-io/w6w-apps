import { assertEquals } from "@std/assert";
import aiFeedsList from "../../actions/ai-feeds-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ai-feeds-list: GETs /v3/alerts and passes both arrays through unchanged", async () => {
  const body = {
    userAlerts: [],
    enterpriseAlerts: [{
      id: "a1",
      label: "LiveScore",
      feedId: "feed/https://feedly.com/f/alert/a1",
    }],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await aiFeedsList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/alerts");
  assertEquals(out, body);
});
