import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/site-delete.ts";

Deno.test("site-delete: DELETEs the site addressed by the override", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: {} });
  await action.execute!({ siteUrl: "https://www.example.com/" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://searchconsole.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fwww.example.com%2F",
  );
});

Deno.test("site-delete: falls back to the connection's default site", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], {
    display: { siteUrl: "sc-domain:example.com" },
  });
  await action.execute!({}, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname).includes("sc-domain:example.com"),
    true,
  );
});
