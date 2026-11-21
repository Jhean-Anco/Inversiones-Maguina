import assert from "node:assert/strict";
import test from "node:test";
import { verifyMainRelease } from "./verify-main-release.mjs";

const sha = "a".repeat(40);
const headSha = "b".repeat(40);
const pr = {
  number: 42,
  merged_at: "2026-11-17T12:00:00Z",
  merge_commit_sha: sha,
  base: { ref: "main" },
  head: { ref: "release/2026-11-17-bbbbbbbb", sha: headSha },
};

function fakeFetch(responses) {
  const requests = [];
  return {
    requests,
    fetchImpl: async (url) => {
      requests.push(String(url));
      const body = responses.shift();
      if (!body) throw new Error(`Unexpected request: ${url}`);
      return { ok: true, json: async () => body };
    },
  };
}

test("autoriza publicación solo para PR fusionado y validado en su SHA exacto", async () => {
  const { fetchImpl } = fakeFetch([
    [pr],
    { workflow_runs: [{ id: 99, event: "pull_request", status: "completed", conclusion: "success", head_sha: headSha, head_branch: pr.head.ref, pull_requests: [{ number: pr.number }] }] },
  ]);
  const result = await verifyMainRelease({ repository: "Jhean-Anco/Inversiones-Maguina", sha, token: "read-only", fetchImpl });
  assert.deepEqual(result, { pullRequest: 42, headSha, validatedRun: 99 });
});

test("accepts the exact successful head SHA when GitHub links a reused branch to a newer PR", async () => {
  const { fetchImpl } = fakeFetch([
    [pr],
    { workflow_runs: [{
      id: 102,
      event: "pull_request",
      status: "completed",
      conclusion: "success",
      head_sha: headSha,
      head_branch: pr.head.ref,
      pull_requests: [{ number: 99, head: { sha: "c".repeat(40) } }],
    }] },
  ]);
  const result = await verifyMainRelease({ repository: "Jhean-Anco/Inversiones-Maguina", sha, token: "read-only", fetchImpl });
  assert.equal(result.pullRequest, pr.number);
  assert.equal(result.validatedRun, 102);
});

test("rechaza commits directos a main", async () => {
  const { fetchImpl } = fakeFetch([[]]);
  await assert.rejects(
    verifyMainRelease({ repository: "Jhean-Anco/Inversiones-Maguina", sha, token: "read-only", fetchImpl }),
    /no corresponde a la fusión de un Pull Request/,
  );
});

test("rechaza PR fusionado sin validación exitosa del SHA de origen", async () => {
  const { fetchImpl } = fakeFetch([
    [pr],
    { workflow_runs: [{ id: 101, event: "pull_request", status: "completed", conclusion: "failure", head_sha: headSha, head_branch: pr.head.ref }] },
  ]);
  await assert.rejects(
    verifyMainRelease({ repository: "Jhean-Anco/Inversiones-Maguina", sha, token: "read-only", fetchImpl }),
    /No existe una validación PR exitosa/,
  );
});
