import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { validateCommit } from './policy.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const { graph } = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { release } = JSON.parse(readFileSync('nx.json', 'utf8'));
const event = process.env.GITHUB_EVENT_PATH
  ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  : null;
// Only new work is governed by this rollout; never relabel historical commits.
const rollout = 'db8b76f81144e2e1e3f9c36dca59ffc8dfcd0594';
const head = event?.pull_request?.head.sha ?? process.argv[4] ?? 'HEAD';
let base =
  event?.pull_request?.base.sha ?? process.argv[3] ?? event?.before ?? rollout;
if (/^0+$/.test(base)) base = rollout;
git('merge-base', '--is-ancestor', rollout, head);
git('cat-file', '-e', `${base}^{commit}`);
base = git('merge-base', base, head);
const tags = git('tag', '--list').split('\n');
const released = Object.keys(graph.nodes).filter((name) =>
  tags.some((tag) => tag.startsWith(`${name}@`)),
);
function check(message, files, label) {
  try {
    validateCommit({
      message,
      files,
      graph,
      types: release.conventionalCommits.types,
      released,
    });
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}
const commits = git('rev-list', '--reverse', '--no-merges', `${base}..${head}`)
  .split('\n')
  .filter(Boolean);
for (const sha of commits) {
  const files = execFileSync(
    'git',
    ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-z', sha],
    { encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean);
  check(git('show', '-s', '--format=%B', sha), files, sha);
}
if (event?.pull_request) {
  const files = execFileSync('git', ['diff', '--name-only', '-z', base, head], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);
  check(
    `${event.pull_request.title}\n\n${event.pull_request.body ?? ''}`,
    files,
    'Proposed squash message',
  );
}
console.log(
  `Commit/lifecycle policy passed for ${commits.length} commits${event?.pull_request ? ' and proposed squash message' : ''}.`,
);
