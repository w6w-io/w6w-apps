import { assertEquals } from "@std/assert";
import clientListsGet from "../../actions/client-lists-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-lists-get: GETs /clients/{clientid}/lists.json", async () => {
  const lists = [{ ListID: "a58ee1d3039b8bec838e6d1482a8a965", Name: "List One" }];
  const { ctx, calls } = mockCtx([{ body: lists }]);
  const out = await clientListsGet.execute({ clientId: "cid" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/lists.json`);
  assertEquals(out, lists);
});
