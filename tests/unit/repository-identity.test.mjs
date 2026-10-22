import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RELAY_REPOSITORY_SLUG,
  RELAY_REPOSITORY_URL,
  foreignRepositoryPointers,
} from "../../scripts/lib/repository-identity.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHECK_SCRIPT = path.join(REPO_ROOT, "scripts", "ci", "check-repository-identity.mjs");

// Regular tracked files outside tests/ (fixtures there carry synthetic remotes).
function shippedFiles() {
  return execFileSync("git", ["ls-files", "-s", "--", ".", ":!tests/"], { cwd: REPO_ROOT, encoding: "utf8" })
    .split("\n")
    .filter((line) => /^100(644|755) /.test(line))
    .map((line) => line.split("\t")[1]);
}

test("repository identity derives from package.json repository.url", () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  assert.equal(pkg.repository.url, `${RELAY_REPOSITORY_URL}.git`);
  assert.equal(RELAY_REPOSITORY_URL, `https://github.com/${RELAY_REPOSITORY_SLUG}`);
});

test("foreignRepositoryPointers flags other owners and ignores other repos", () => {
  const [, name] = RELAY_REPOSITORY_SLUG.split("/");
  assert.deepEqual(
    foreignRepositoryPointers(
      [
        `codex plugin marketplace add relay-org/${name}`,
        `https://github.com/relay-org/${name}.git#feat/x`,
        `git@github.com:other/${name}.git`,
        `codex plugin marketplace add ${RELAY_REPOSITORY_SLUG}@main`,
        `${RELAY_REPOSITORY_URL}/issues/13`,
        `https://github.com/relay-org/${name}-tools`,
        `codex plugin marketplace add ~/projects/${name}`,
      ].join("\n"),
    ),
    [`relay-org/${name}`, `relay-org/${name}`, `other/${name}`],
  );
});

test("shipped files point only at the canonical repository", () => {
  const offenders = [];
  for (const file of shippedFiles()) {
    for (const slug of foreignRepositoryPointers(readFileSync(path.join(REPO_ROOT, file), "utf8"))) {
      offenders.push(`${file}: ${slug}`);
    }
  }
  assert.deepEqual(offenders, [], `expected only ${RELAY_REPOSITORY_SLUG}`);
});

test("check-repository-identity rejects a CI repository that differs from package.json", () => {
  const run = (env) => spawnSync(process.execPath, [CHECK_SCRIPT], { encoding: "utf8", env: { PATH: process.env.PATH, ...env } });

  assert.equal(run({ GITHUB_REPOSITORY: RELAY_REPOSITORY_SLUG }).status, 0);

  const wrong = run({ GITHUB_REPOSITORY: "relay-org/relay" });
  assert.equal(wrong.status, 1);
  assert.match(wrong.stderr, new RegExp(`names ${RELAY_REPOSITORY_SLUG}, but this is relay-org/relay`));

  const missing = run({});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /GITHUB_REPOSITORY is required/);
});
