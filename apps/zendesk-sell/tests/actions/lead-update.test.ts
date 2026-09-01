import { assertEquals } from "@std/assert";
import leadUpdate from "../../actions/lead-update.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-update: PUTs to /v2/leads/:id with a replaced tag set", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await leadUpdate.execute({ id: 1, tags: "important,friend" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/leads/1");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.tags, ["important", "friend"]);
});
