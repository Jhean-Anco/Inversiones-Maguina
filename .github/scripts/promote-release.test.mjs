import assert from "node:assert/strict";
import test from "node:test";
import { promoteRelease } from "./promote-release.mjs";

const repository = "Jhean-Anco/Inversiones-Maguina";
const sha = "c".repeat(40);
const branch = "release/cccccccccccc";

function fakeFetch(responses) {
  const requests = [];
  return {
    requests,
    fetchImpl: async (url, options = {}) => {
      requests.push({ url: String(url), options });
      const response = responses.shift();
      if (!response) throw new Error(`Unexpected request: ${url}`);
      return { ok: response.ok ?? true, status: response.status ?? 200, json: async () => response.body ?? response };
    },
  };
}

test("promueve el SHA exacto, crea rama candidata y PR sin duplicar", async () => {
  const { requests, fetchImpl } = fakeFetch([
    { status: "ahead" },
    { commit: { message: "Release candidata\nDetalle" } },
    [],
    [],
    {},
    { number: 73, html_url: "https://github.com/Jhean-Anco/Inversiones-Maguina/pull/73" },
  ]);
  const result = await promoteRelease({
    repository,
    sourceBranch: "development",
    sourceSha: sha,
    token: "app-installation-token",
    fetchImpl,
  });
  assert.deepEqual(result, { branch, pullRequest: 73, url: "https://github.com/Jhean-Anco/Inversiones-Maguina/pull/73", created: true });
  assert.equal(requests.length, 6);
  assert.equal(requests[4].options.method, "POST");
  assert.equal(JSON.parse(requests[4].options.body).sha, sha);
  assert.equal(requests[5].options.method, "POST");
  assert.equal(JSON.parse(requests[5].options.body).head, branch);

});

test("no crea PR repetidos para un candidato ya publicado", async () => {
  const { requests, fetchImpl } = fakeFetch([
    { status: "ahead" },
    { commit: { message: "Already promoted" } },
    [{
    number: 73,
    html_url: "https://github.com/Jhean-Anco/Inversiones-Maguina/pull/73",
    base: { ref: "main" },
    head: { ref: branch, sha, repo: { full_name: repository } },
    }],
  ]);
  const result = await promoteRelease({ repository, sourceBranch: "development", sourceSha: sha, token: "app-token", fetchImpl });
  assert.equal(result.created, false);
  assert.equal(requests.length, 3);
});

test("no reutiliza un PR existente si la rama candidata apunta a otro SHA", async () => {
  const { requests, fetchImpl } = fakeFetch([
    { status: "ahead" },
    { commit: { message: "Candidate" } },
    [{
      number: 74,
      html_url: "https://github.com/Jhean-Anco/Inversiones-Maguina/pull/74",
      base: { ref: "main" },
      head: { ref: branch, sha: "d".repeat(40), repo: { full_name: repository } },
    }],
  ]);
  await assert.rejects(
    promoteRelease({ repository, sourceBranch: "development", sourceSha: sha, token: "app-token", fetchImpl }),
    /SHA no coincide con el solicitado/,
  );
  assert.equal(requests.length, 3);
});

test("rechaza SHA ajeno a la rama y referencias auxiliares inválidas", async () => {
  const { requests, fetchImpl } = fakeFetch([{ status: "diverged" }]);
  await assert.rejects(
    promoteRelease({ repository, sourceBranch: "development", sourceSha: sha, token: "app-token", fetchImpl }),
    /no pertenece a development/,
  );
  assert.equal(requests.length, 1);
  await assert.rejects(
    promoteRelease({ repository, sourceBranch: "main", sourceSha: sha, token: "app-token", fetchImpl }),
    /no se admite main/,
  );
});
