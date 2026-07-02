import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-workspace-hook.ts";

Deno.test("create-workspace-hook: POSTs the required subscription payload", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "{abc}" } }]);
  await action.execute(
    { workspace: "acme", url: "https://cb", events: ["repo:push"] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/workspaces/acme/hooks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.url, "https://cb");
  assertEquals(body.events, ["repo:push"]);
  assertEquals(body.active, true);
  assertEquals(body.description, "w6w webhook");
  assert(!("secret" in body), "secret must be omitted when not provided");
});

Deno.test("create-workspace-hook: forwards optional description, active, secret", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "{abc}" } }]);
  await action.execute(
    {
      workspace: "acme",
      url: "https://cb",
      events: ["repo:push", "pullrequest:created"],
      description: "release notes",
      active: false,
      secret: "shh",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.description, "release notes");
  assertEquals(body.active, false);
  assertEquals(body.secret, "shh");
  assertEquals(body.events, ["repo:push", "pullrequest:created"]);
});
