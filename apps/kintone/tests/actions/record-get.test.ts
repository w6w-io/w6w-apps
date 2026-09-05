import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-get.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("record-get: GETs /k/v1/record.json and unwraps the `record` envelope", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { record: { $id: { type: "__ID__", value: "100" } } } }],
    conn,
  );
  const out = await action.execute({ appId: "1", recordId: "100" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/record.json?app=1&id=100");
  assertEquals(out, { $id: { type: "__ID__", value: "100" } });
});
