import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-sender.ts";

Deno.test("create-sender: POSTs /v3/senders with name and email", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 42 } }]);
  await action.execute!({ name: "Ada", email: "ada@x.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/senders");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Ada", email: "ada@x.com" });
});

Deno.test("create-sender: forwards dedicated IPs when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 42 } }]);
  await action.execute!(
    {
      name: "Ada",
      email: "ada@x.com",
      ips: [{ ip: "1.2.3.4", domain: "x.com", weight: 100 }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.ips, [{ ip: "1.2.3.4", domain: "x.com", weight: 100 }]);
});
