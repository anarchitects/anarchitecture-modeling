import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const targets = ['lint', 'test', 'build', 'typecheck'];

// Only successful, complete, ancestor comparisons may narrow verification.
// Never pass refs or arbitrary input to a shell.
export function selectComparison({ status, base, head, cwd = process.cwd() }) {
  const all = (reason) => ({ mode: 'all', reason });
  if (status !== 'success') return all('SHA lookup unavailable or failed');
  if (![base, head].every((sha) => /^[a-f0-9]{40}$/.test(sha ?? ''))) {
    return all('missing or malformed commit SHA');
  }
  const git = (...args) =>
    spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
  if (git('rev-parse', '--is-shallow-repository').stdout?.trim() !== 'false') {
    return all('incomplete Git history');
  }
  if (git('rev-parse', 'HEAD').stdout?.trim() !== head) {
    return all('comparison head differs from checkout');
  }
  if (
    [base, head].some(
      (sha) => git('cat-file', '-e', `${sha}^{commit}`).status !== 0,
    )
  ) {
    return all('commit unavailable');
  }
  if (
    base === head ||
    git('merge-base', '--is-ancestor', base, head).status !== 0
  ) {
    return all('comparison does not span an ancestor and checkout');
  }
  // A partial clone can contain commits but omit the historical trees. Check
  // the same diff Nx will need before allowing it to narrow validation.
  if (
    git('diff', '--name-only', '--no-renames', '--relative', '-z', base, head)
      .status !== 0
  ) {
    return all('comparison trees or diff unavailable');
  }
  return {
    mode: 'affected',
    base,
    head,
    reason: 'verified ancestor comparison',
  };
}

export function nxArguments(selection) {
  return selection.mode === 'affected'
    ? [
        'nx',
        'affected',
        '-t',
        ...targets,
        `--base=${selection.base}`,
        `--head=${selection.head}`,
      ]
    : ['nx', 'run-many', '-t', ...targets];
}

export function runValidation(
  selection,
  { run = spawnSync, env = process.env } = {},
) {
  // Do not inherit an unverified comparison, including on the broad fallback.
  const { NX_BASE, NX_HEAD, ...taskEnv } = env;
  const result = run('yarn', nxArguments(selection), {
    stdio: 'inherit',
    env: taskEnv,
  });
  // Signals/spawn errors are failures, never a successful empty run.
  return Number.isInteger(result.status) ? result.status : 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const selection = selectComparison({
    status: process.env.COMPARISON_STATUS,
    base: process.env.COMPARISON_BASE,
    head: process.env.COMPARISON_HEAD,
  });
  const note = `Nx selection: ${JSON.stringify(selection)}`;
  console.log(note);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${note}\n\n`);
  }
  process.exitCode = runValidation(selection);
}
