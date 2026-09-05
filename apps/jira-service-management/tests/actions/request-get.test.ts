import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/request-get.ts";

Deno.test("request-get: GETs the request by id or key", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { issueKey: "HD-1" } }]);
  await action.execute({ issueIdOrKey: "HD-1" }, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/servicedeskapi/request/HD-1");
});

Deno.test("request-get: sends expand as repeated query params", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: {} }]);
  await action.execute({ issueIdOrKey: "HD-1", expand: "participant, sla" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("expand"), ["participant", "sla"]);
});
