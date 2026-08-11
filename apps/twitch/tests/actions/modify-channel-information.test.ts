import { assert, assertEquals, assertRejects } from "@std/assert";
import modifyChannelInformation from "../../actions/modify-channel-information.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/** `broadcaster_id` is a QUERY parameter; everything being changed is in the body. */
Deno.test("modify-channel-information: PATCHes with the ID in the query and the change in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await modifyChannelInformation.execute(
    { broadcasterId: "141981764", title: "Standard Output" },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/helix/channels");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "141981764" });
  assertEquals(JSON.parse(calls[0].body!), { title: "Standard Output" });
  assertEquals(out, { status: 204 });
});

/** `"0"` and `""` are how Twitch documents CLEARING the category, so both must survive. */
Deno.test("modify-channel-information: an empty gameId is forwarded, because it clears the category", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await modifyChannelInformation.execute({ broadcasterId: "1", gameId: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { game_id: "" });
});

Deno.test("modify-channel-information: tags replace wholesale, and clearing needs the explicit flag", async () => {
  const withTags = mockCtx([{ status: 204 }]);
  await modifyChannelInformation.execute({ broadcasterId: "1", tags: "a, b" }, withTags.ctx);
  assertEquals(JSON.parse(withTags.calls[0].body!), { tags: ["a", "b"] });

  const cleared = mockCtx([{ status: 204 }]);
  await modifyChannelInformation.execute({ broadcasterId: "1", setTags: true }, cleared.ctx);
  assertEquals(JSON.parse(cleared.calls[0].body!), { tags: [] });
});

/**
 * Twitch documents clearing CCLs as sending `is_enabled: false` for every
 * label, so "replace" has to enumerate all six settable ones — not just the
 * selected ones.
 */
Deno.test("modify-channel-information: replacing CCLs sends every settable label with its state", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await modifyChannelInformation.execute({
    broadcasterId: "1",
    contentClassificationLabels: ["Gambling"],
    setContentClassificationLabels: true,
  }, ctx);

  const body = JSON.parse(calls[0].body!) as { content_classification_labels: unknown[] };
  assertEquals(body.content_classification_labels.length, 6);
  assert(
    body.content_classification_labels.some((l) =>
      JSON.stringify(l) === JSON.stringify({ id: "Gambling", is_enabled: true })
    ),
  );
  assert(
    body.content_classification_labels.some((l) =>
      JSON.stringify(l) === JSON.stringify({ id: "SexualThemes", is_enabled: false })
    ),
  );
  // MatureGame is applied by Twitch from the category and cannot be set.
  assertEquals(calls[0].body!.includes("MatureGame"), false);
});

Deno.test("modify-channel-information: refuses a request that would change nothing", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(modifyChannelInformation.execute({ broadcasterId: "1" }, ctx)),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0, "spent a request on a change Twitch would have refused");
});
