#!/usr/bin/env node
// Repository-identity guard: package.json `repository.url` must name the GitHub
// repository CI runs in ($GITHUB_REPOSITORY). Unit tests only prove every copy
// agrees with package.json; this proves package.json itself is right. #205
// rewrote it to an unrelated third-party org (`relay-org/relay`) and every copy
// agreed, so the published install command pointed at someone else's repo
// (#270). Run in CI; locally pass GITHUB_REPOSITORY=<owner>/<repo>.

import { RELAY_REPOSITORY_SLUG } from "../lib/repository-identity.mjs";

const actual = process.env.GITHUB_REPOSITORY;
if (!actual) {
  console.error("check-repository-identity: GITHUB_REPOSITORY is required (set by GitHub Actions)");
  process.exit(1);
}
if (actual.toLowerCase() !== RELAY_REPOSITORY_SLUG.toLowerCase()) {
  console.error(
    `check-repository-identity: package.json repository.url names ${RELAY_REPOSITORY_SLUG}, but this is ${actual}`,
  );
  process.exit(1);
}
console.log(`check-repository-identity: ok (${RELAY_REPOSITORY_SLUG})`);
