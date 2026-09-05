import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/request-transition.ts";

Deno.test("request-transition: POSTs the transition id", async () => {
  const { ctx, calls } = mockJsmCtx([{ status: 204 }]);
  const out = await action.execute({ issueIdOrKey: "HD-1", transitionId: "1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/request/HD-1/transition",
  );
  assertEquals(JSON.parse(calls[0].body!), { id: "1" });
  assertEquals(out, { status: 204 });
});

Deno.test("request-transition: attaches a comment when given one", async () => {
  const { ctx, calls } = mockJsmCtx([{ status: 204 }]);
  await action.execute({ issueIdOrKey: "HD-1", transitionId: "1", comment: "Fixed it" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    id: "1",
    additionalComment: { body: "Fixed it" },
  });
});
