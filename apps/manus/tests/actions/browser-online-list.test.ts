import { assertEquals } from "@std/assert";
import browserOnlineList from "../../actions/browser-online-list.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("browser-online-list: gets /v2/browser.onlineList and returns the array unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({ data: [{ client_id: "c1", client_name: "Chrome" }] }),
  }]);
  const out = await browserOnlineList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/browser.onlineList");
  assertEquals(out, [{ client_id: "c1", client_name: "Chrome" }]);
});
