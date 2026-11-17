import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const packages = {
  'modeling-core': { root: 'packages/modeling-core', type: 'core' },
  'modeling-metamodel': {
    root: 'packages/modeling-metamodel',
    type: 'metamodel',
  },
};

// Check the resolved graph, including plugin-inferred targets. Missing packages
// are allowed during extraction; a present but incomplete package must fail.
export function checkProjectGraph(graph) {
  if (!graph?.nodes || !graph?.dependencies)
    throw new Error('Invalid Nx project graph');
  const errors = [];
  if (
    graph.nodes['modeling-metamodel'] &&
    (!graph.nodes['modeling-core'] ||
      !graph.dependencies['modeling-metamodel']?.some(
        (edge) => edge.target === 'modeling-core',
      ))
  ) {
    errors.push(
      'modeling-metamodel must resolve its workspace dependency on modeling-core',
    );
  }
  for (const [name, node] of Object.entries(graph.nodes)) {
    const expected = packages[name];
    if (!expected) {
      errors.push(
        `Unexpected project ${name}: review its boundary before admission`,
      );
      continue;
    }
    const data = node.data;
    if (data.root !== expected.root)
      errors.push(`${name}: expected root ${expected.root}`);
    for (const tag of ['scope:foundation', `type:${expected.type}`]) {
      if (!data.tags?.includes(tag)) errors.push(`${name}: missing ${tag}`);
    }
    const lifecycle =
      data.tags?.filter((tag) => tag.startsWith('lifecycle:')) ?? [];
    if (
      lifecycle.length !== 1 ||
      !['lifecycle:unreleased', 'lifecycle:released'].includes(lifecycle[0])
    ) {
      errors.push(`${name}: expected one reviewed lifecycle tag`);
    }
    for (const target of ['build', 'test', 'lint', 'typecheck']) {
      const resolved = data.targets?.[target];
      if (!resolved) errors.push(`${name}: missing resolved ${target} target`);
      else if (resolved.cache !== true || !resolved.inputs?.length) {
        errors.push(`${name}:${target}: declare cache eligibility and inputs`);
      }
    }
    if (!data.targets?.build?.outputs?.length)
      errors.push(`${name}: build needs restorable outputs`);
    for (const dependency of graph.dependencies[name] ?? []) {
      if (
        graph.nodes[dependency.target] &&
        !(
          name === 'modeling-metamodel' && dependency.target === 'modeling-core'
        )
      ) {
        errors.push(`Forbidden dependency ${name} -> ${dependency.target}`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return Object.keys(graph.nodes);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { graph } = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const projects = checkProjectGraph(graph);
  for (const name of projects) {
    const manifest = JSON.parse(
      readFileSync(`${graph.nodes[name].data.root}/package.json`, 'utf8'),
    );
    if (
      manifest.name !== `@anarchitects/${name}` ||
      manifest.nx?.name !== name
    ) {
      throw new Error(`${name}: preserve npm and Nx identities`);
    }
  }
  const note = projects.length
    ? `Resolved Foundation projects: ${projects.join(', ')}. Graph policy passed; runtime boundary and cache proofs remain separate.`
    : 'Bootstrap graph: zero packages and zero package tasks. No library behavior or cache restoration verified.';
  console.log(note);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${note}\n\n`);
}
