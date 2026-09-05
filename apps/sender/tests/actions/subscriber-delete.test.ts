import { assertEquals } from "@std/assert";
import subscriberDelete from "../../actions/subscriber-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-delete: DELETEs /v2/subscribers with no data envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: { message: "Selected subscribers will be deleted shortly", delete_instance: "ref1" } },
  ]);
  const out = await subscriberDelete.execute({ subscribers: ["a@b.com"] }, ctx) as {
    message: string;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/subscribers");
  assertEquals(JSON.parse(calls[0].body!), { subscribers: ["a@b.com"] });
  assertEquals(out.message, "Selected subscribers will be deleted shortly");
});
