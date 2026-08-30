import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/segment-get.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("segment-get: GETs /segments/{id} and unwraps the `list` envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { list: { id: 2, name: "VIP" } } }], conn);
  const out = await action.execute!({ segmentId: 2 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/segments/2");
  assertEquals(out, { id: 2, name: "VIP" });
});
