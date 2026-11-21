import { fileURLToPath } from "node:url";

const apiRoot = "https://api.github.com";

async function githubJson(url, token, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} al consultar ${url}.`);
  return response.json();
}

export async function verifyMainRelease({ repository, sha, token, fetchImpl = fetch }) {
  if (!/^[^/]+\/[^/]+$/.test(repository ?? "") || !/^[a-f0-9]{40}$/.test(sha ?? "") || !token) {
    throw new Error("Se requiere repositorio, SHA completo y token de solo lectura.");
  }

  const associatedPullRequests = await githubJson(
    `${apiRoot}/repos/${repository}/commits/${sha}/pulls`, token, fetchImpl,
  );
  const mergedPullRequests = associatedPullRequests.filter((pr) =>
    pr.base?.ref === "main" && pr.merged_at && pr.merge_commit_sha === sha,
  );
  if (!mergedPullRequests.length) {
    throw new Error("El SHA de main no corresponde a la fusión de un Pull Request hacia main; no se publicará.");
  }

  for (const pr of mergedPullRequests) {
    const query = new URLSearchParams({ event: "pull_request", head_sha: pr.head.sha, per_page: "100" });
    const { workflow_runs: runs } = await githubJson(
      `${apiRoot}/repos/${repository}/actions/workflows/pipeline.yml/runs?${query}`,
      token,
      fetchImpl,
    );
    const passedRun = runs?.find((run) =>
      run.event === "pull_request" &&
      run.status === "completed" &&
      run.conclusion === "success" &&
      run.head_sha === pr.head.sha &&
      run.head_branch === pr.head.ref,
    );
    if (passedRun) {
      return { pullRequest: pr.number, headSha: pr.head.sha, validatedRun: passedRun.id };
    }
  }

  throw new Error("No existe una validación PR exitosa para el SHA exacto de la rama fusionada; no se publicará.");
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLocaleLowerCase() === process.argv[1].toLocaleLowerCase()) {
  const result = await verifyMainRelease({
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA,
    token: process.env.GITHUB_TOKEN,
  });
  console.log(`Publicación autorizada por PR #${result.pullRequest}; validación ${result.validatedRun} para ${result.headSha}.`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import("node:fs/promises");
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `Publicación autorizada por PR #${result.pullRequest}; validación ${result.validatedRun} para ${result.headSha}.\n`);
  }
}
