import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const apiRoot = "https://api.github.com";

function validateSourceBranch(branch) {
  return typeof branch === "string" &&
    branch.length > 0 && branch.length <= 200 &&
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) &&
    !branch.includes("..") && !branch.includes("//") &&
    !branch.endsWith("/") && !branch.endsWith(".lock") &&
    branch !== "main" && !branch.startsWith("release/");
}

async function githubJson(url, token, fetchImpl, method = "GET", body) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} al procesar ${new URL(url).pathname}.`);
  return response.status === 204 ? null : response.json();
}

export async function promoteRelease({
  repository,
  sourceBranch,
  sourceSha,
  token,
  fetchImpl = fetch,
}) {
  if (!/^[^/]+\/[^/]+$/.test(repository ?? "") || !/^[a-f0-9]{40}$/.test(sourceSha ?? "") || !token) {
    throw new Error("Se requiere repositorio, SHA completo de 40 caracteres y token de GitHub.");
  }
  if (!validateSourceBranch(sourceBranch)) {
    throw new Error("La rama origen debe ser auxiliar; no se admite main ni otra rama release/.");
  }

  const [owner] = repository.split("/");
  const candidateBranch = `release/${sourceSha.slice(0, 12)}`;
  const comparison = await githubJson(
    `${apiRoot}/repos/${repository}/compare/${sourceSha}...${encodeURIComponent(sourceBranch)}`,
    token,
    fetchImpl,
  );
  if (!["ahead", "identical"].includes(comparison.status)) {
    throw new Error(`El SHA solicitado no pertenece a ${sourceBranch} (comparación: ${comparison.status}).`);
  }
  const commit = await githubJson(`${apiRoot}/repos/${repository}/commits/${sourceSha}`, token, fetchImpl);
  const pullsQuery = new URLSearchParams({ state: "all", base: "main", head: `${owner}:${candidateBranch}`, per_page: "100" });
  const priorPullRequests = await githubJson(
    `${apiRoot}/repos/${repository}/pulls?${pullsQuery}`, token, fetchImpl,
  );
  const priorPullRequest = priorPullRequests.find((pr) =>
    pr.base?.ref === "main" && pr.head?.ref === candidateBranch && pr.head?.repo?.full_name?.toLowerCase() === repository.toLowerCase(),
  );
  if (priorPullRequest) {
    if (priorPullRequest.head?.sha !== sourceSha) {
      throw new Error(`El candidato ${candidateBranch} ya tiene un PR, pero su SHA no coincide con el solicitado; se detiene para evitar promover un commit distinto.`);
    }
    return { branch: candidateBranch, pullRequest: priorPullRequest.number, url: priorPullRequest.html_url, created: false };
  }

  const refs = await githubJson(
    `${apiRoot}/repos/${repository}/git/matching-refs/heads/${candidateBranch}`,
    token,
    fetchImpl,
  );
  const fullRef = `refs/heads/${candidateBranch}`;
  const existingRef = refs.find((ref) => ref.ref === fullRef);
  if (existingRef && existingRef.object?.sha !== sourceSha) {
    throw new Error(`La rama ${candidateBranch} ya existe en otro SHA; se detiene para evitar promover un candidato distinto.`);
  }
  if (!existingRef) {
    await githubJson(`${apiRoot}/repos/${repository}/git/refs`, token, fetchImpl, "POST", {
      ref: fullRef,
      sha: sourceSha,
    });
  }

  const subject = (commit.commit?.message ?? "Cambios de desarrollo").split(/\r?\n/, 1)[0].slice(0, 120);
  const title = `Promover a producción: ${subject}`.slice(0, 250);
  const body = [
    "## Candidato a producción",
    "",
    `- Rama origen: \`${sourceBranch}\``,
    `- SHA solicitado: \`${sourceSha}\``,
    `- Rama candidata: \`${candidateBranch}\``,
    "",
    "Este PR se creó para ejecutar la validación obligatoria antes de integrar el candidato en \`main\`.",
    "La automatización no activa auto-merge.",
  ].join("\n");
  const pullRequest = await githubJson(`${apiRoot}/repos/${repository}/pulls`, token, fetchImpl, "POST", {
    title,
    head: candidateBranch,
    base: "main",
    body,
    draft: false,
  });

  return { branch: candidateBranch, pullRequest: pullRequest.number, url: pullRequest.html_url, created: true };
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLocaleLowerCase() === process.argv[1].toLocaleLowerCase()) {
  const result = await promoteRelease({
    repository: process.env.GITHUB_REPOSITORY,
    sourceBranch: process.env.SOURCE_BRANCH,
    sourceSha: process.env.SOURCE_SHA,
    token: process.env.RELEASE_APP_TOKEN,
  });
  const summary = result.created
    ? `PR #${result.pullRequest} creado para \`${result.branch}\`: ${result.url}`
    : `El candidato ya tiene un PR #${result.pullRequest}: ${result.url}`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}
