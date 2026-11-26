import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

// Use the same SemVer implementation as the pinned Nx installation.
const nxRequire = createRequire(import.meta.resolve('nx/package.json'));
const semver = nxRequire('semver');
const releaseProjects = JSON.parse(
  readFileSync(new URL('../../nx.json', import.meta.url)),
).release.projects;

export function validateCommit({
  message,
  files,
  graph,
  types,
  released = [],
}) {
  const header = message.split('\n')[0];
  const match = /^([a-z][a-z0-9]*)(?:\(([^()]+)\))?(!)?: (\S.*)$/.exec(header);
  if (!match) throw new Error('Expected a Conventional Commit header');
  const [, type, scope, bang] = match;
  if (!Object.hasOwn(types, type))
    throw new Error(`Unknown commit type: ${type}`);
  if (scope && !Object.hasOwn(graph.nodes, scope))
    throw new Error(`Scope must be an exact Nx project name: ${scope}`);
  const touched = Object.entries(graph.nodes)
    .filter(([, { data }]) => files.some((f) => f.startsWith(`${data.root}/`)))
    .map(([name]) => name);
  const isReleased = (name) =>
    released.includes(name) ||
    graph.nodes[name].data.tags?.includes('lifecycle:released');
  const unreleased = touched.filter((name) => !isReleased(name));
  const breaking = Boolean(bang) || /^BREAKING[ -]CHANGE:\s*\S/m.test(message);
  if (type === 'init') {
    if (!scope || isReleased(scope) || breaking)
      throw new Error(
        'init requires an unreleased project scope and no breaking intent',
      );
    if (touched.some((name) => name !== scope))
      throw new Error(
        'Split init changes by exact project; mixed lifecycle intent is unsafe',
      );
  } else if (unreleased.length) {
    throw new Error(
      `Unreleased package changes require init: ${unreleased.join(', ')}`,
    );
  }
  if (scope && touched.length && !touched.includes(scope))
    throw new Error('Commit scope does not match any changed package');
  return { type, scope, breaking, touched };
}

// Nx determines proposed versions. This gate only checks its output against
// independently reviewed compatibility impact and release evidence.
export function validateCandidate(candidate) {
  const {
    sourceSha,
    projectsVersionData: versions,
    history,
    impacts,
    authorization,
    artifacts,
  } = candidate;
  if (!/^[a-f0-9]{40}$/.test(sourceSha ?? ''))
    throw new Error('Exact source SHA required');
  if (
    authorization?.owner !== 'vrxj81' ||
    authorization.sourceSha !== sourceSha ||
    !authorization.reference
  )
    throw new Error('Candidate-specific owner authorization required');
  if (!versions || !Object.keys(versions).length)
    throw new Error('Nx version data required');
  if (Object.keys(versions).some((name) => !releaseProjects.includes(name)))
    throw new Error(
      'Candidate contains a project outside the release configuration',
    );
  const changed = Object.entries(versions).filter(
    ([, v]) => v.newVersion !== null,
  );
  if (!changed.length) throw new Error('No release proposed by Nx');
  for (const [name, { currentVersion, newVersion }] of changed) {
    const h = history?.[name];
    const impact = impacts?.[name];
    if (
      !h ||
      h.sourceSha !== sourceSha ||
      h.registryChecked !== true ||
      h.tagsChecked !== true ||
      h.otherChannelsReviewed !== true ||
      !h.reference ||
      !Array.isArray(h.versions) ||
      !h.versions.every((v) => semver.valid(v)) ||
      !Number.isFinite(Date.parse(h.checkedAt)) ||
      Date.now() - Date.parse(h.checkedAt) > 24 * 60 * 60 * 1000 ||
      Date.parse(h.checkedAt) > Date.now()
    )
      throw new Error(
        `${name}: fresh, reviewed registry/tag/channel history required`,
      );
    if (!semver.valid(newVersion) || semver.prerelease(newVersion))
      throw new Error(
        `${name}: official prereleases are not part of this release policy`,
      );
    if (
      !['none', 'patch', 'feature', 'breaking'].includes(impact?.level) ||
      !impact.reference
    )
      throw new Error(`${name}: reviewed compatibility impact required`);
    if (!h.versions.length) {
      // First-release previews resolve from disk: before applying versions it
      // is 0.0.0; on the committed candidate it is already 0.0.1.
      if (!['0.0.0', '0.0.1'].includes(currentVersion))
        throw new Error(
          `${name}: empty history conflicts with the Nx baseline`,
        );
      if (newVersion !== '0.0.1')
        throw new Error(`${name}: first distribution must be 0.0.1`);
    } else {
      if (
        !semver.valid(currentVersion) ||
        !h.versions.includes(currentVersion) ||
        semver.rsort([...h.versions])[0] !== currentVersion
      )
        throw new Error(
          `${name}: Nx baseline must match reviewed latest distribution`,
        );
      if (!semver.gt(newVersion, currentVersion))
        throw new Error(`${name}: version must advance`);
      const stabilization =
        semver.major(currentVersion) === 0 && semver.major(newVersion) >= 1;
      if (
        stabilization &&
        (newVersion !== '1.0.0' ||
          authorization.stabilizations?.[name] !== '1.0.0')
      )
        throw new Error(`${name}: exact 1.0.0 stabilization decision required`);
      const bump =
        impact.level === 'breaking'
          ? semver.major(currentVersion) === 0
            ? 'minor'
            : 'major'
          : impact.level === 'feature' && semver.major(currentVersion) > 0
            ? 'minor'
            : 'patch';
      if (semver.lt(newVersion, semver.inc(currentVersion, bump)))
        throw new Error(
          `${name}: insufficient bump for ${impact.level} impact`,
        );
    }
    if (authorization.versions?.[name] !== newVersion)
      throw new Error(`${name}: version not authorized`);
    const a = artifacts?.[name];
    if (
      a?.manifestVersion !== newVersion ||
      a.artifactVersion !== newVersion ||
      a.tag !== `${name}@${newVersion}` ||
      !/^[a-f0-9]{64}$/.test(a.sha256 ?? '') ||
      authorization.artifactHashes?.[name] !== a.sha256
    )
      throw new Error(
        `${name}: authorized manifest/tag/artifact identity must agree`,
      );
  }
  return changed.map(([name]) => name);
}
