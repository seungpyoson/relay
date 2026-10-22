import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// package.json `repository.url` is the single owner of Relay's canonical GitHub
// identity. Manifests, install hints, and docs derive from it so a rename
// changes one value; scripts/ci/check-repository-identity.mjs asserts it names
// the repository CI actually runs in (the #270 class: #205 rewrote it to an
// unrelated third-party org and every copy agreed).
const PACKAGE_JSON = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json");
const GITHUB_REPOSITORY_URL = /^https:\/\/github\.com\/([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9._-]+?)\.git$/;

function readRepositoryUrl() {
  const url = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")).repository?.url;
  if (typeof url !== "string") {
    throw new Error(`${PACKAGE_JSON}: repository.url is required`);
  }
  const match = GITHUB_REPOSITORY_URL.exec(url);
  if (!match) {
    throw new Error(`${PACKAGE_JSON}: repository.url must be https://github.com/<owner>/<repo>.git, got ${url}`);
  }
  return { owner: match[1], name: match[2] };
}

const { owner, name } = readRepositoryUrl();

export const RELAY_REPOSITORY_SLUG = `${owner}/${name}`;
export const RELAY_REPOSITORY_URL = `https://github.com/${RELAY_REPOSITORY_SLUG}`;

// A pointer to "this repository" under any owner: a GitHub URL or a
// `marketplace add <owner>/<repo>` install command.
const REPOSITORY_POINTER = new RegExp(
  `(?:github\\.com[/:]|marketplace add )([A-Za-z0-9][A-Za-z0-9-]*)/${name.replaceAll(".", "\\.")}(?![A-Za-z0-9_-])`,
  "g",
);

export function foreignRepositoryPointers(text) {
  return Array.from(text.matchAll(REPOSITORY_POINTER), (match) => `${match[1]}/${name}`)
    .filter((slug) => slug !== RELAY_REPOSITORY_SLUG);
}
