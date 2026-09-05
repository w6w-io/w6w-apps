import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-list: hits GET /v2.1/users", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await userList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2.1/users");
});
