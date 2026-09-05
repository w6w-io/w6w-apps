import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: reports ok when the Connect API component is operational", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "Connect API", status: "operational" },
        { name: "Admin API", status: "major_outage" },
      ],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(new URL(calls[0].url).hostname, "www.canvastatus.com");
  assertEquals(result.state, "ok");
});

Deno.test("service: reports degraded/down from the Connect API component specifically, not the page", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "Connect API", status: "major_outage" },
        { name: "Admin API", status: "operational" },
      ],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("service: reports unknown, not down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: reports unknown if the Connect API component disappears from the feed", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "none" },
      components: [{ name: "Something Else", status: "operational" }],
    },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: is unsigned and widens egress only to the status host", () => {
  assertEquals(service.credential ?? "none", "none");
  assertEquals(service.network?.allow, ["www.canvastatus.com"]);
});
