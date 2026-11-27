import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createPublishWorkspace } from './nx-publish.mjs';
import { publicationGate } from './nx-publish-gate.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = resolve('.');

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'foundation-nx-publish-'));
  const report = { artifacts: {}, supportArtifacts: {} };
  const histories = {};
  for (const name of ['modeling-core', 'modeling-metamodel']) {
    const source = join(directory, name);
    mkdirSync(source);
    const manifest = {
      name: `@anarchitects/${name}`,
      version: '0.0.3',
      publishConfig: {
        access: 'public',
        registry: 'https://registry.npmjs.org',
        provenance: true,
      },
      ...(name === 'modeling-metamodel'
        ? { dependencies: { '@anarchitects/modeling-core': '0.0.3' } }
        : {}),
    };
    writeFileSync(join(source, 'package.json'), JSON.stringify(manifest));
    writeFileSync(
      join(source, 'index.js'),
      'throw new Error("Candidate code must never execute");\n',
    );
    const [pack] = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          source,
          '--json',
          '--ignore-scripts',
          '--pack-destination',
          directory,
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            npm_config_cache: join(directory, '.npm-cache'),
          },
        },
      ),
    );
    report.artifacts[name] = {
      manifest,
      artifactVersion: manifest.version,
      file: pack.filename,
      sha256: sha(readFileSync(join(directory, pack.filename))),
      integrity: pack.integrity,
    };
    histories[name] = [];
  }
  return {
    directory,
    report,
    histories,
    publishNames: Object.keys(report.artifacts),
  };
}

test(
  'installed Nx publishes the exact repacked pair in dependency order; candidate code never executes',
  { timeout: 90000 },
  () => {
    const context = fixture();
    try {
      const workspace = createPublishWorkspace(
        context.directory,
        join(context.directory, 'workspace'),
        context.report,
        context.histories,
        context.publishNames,
      );
      const bin = join(context.directory, 'bin');
      mkdirSync(bin);
      const events = join(context.directory, 'events');
      writeFileSync(events, '');
      // Only this disposable test process replaces registry IO. No real upload or credentials.
      const hook = join(context.directory, 'fetch.mjs');
      writeFileSync(
        hook,
        `
      import {readFileSync, appendFileSync} from 'node:fs';
      import {join,basename} from 'node:path';
      import cp from 'node:child_process';
      for (const method of ['spawn','spawnSync','execFile','execFileSync']) {
        const original=cp[method];
        cp[method]=function(command,args,...rest) {
          if(basename(command)==='npm') return original.call(this,process.execPath,[${JSON.stringify(join(bin, 'npm'))},...args],...rest);
          return original.call(this,command,args,...rest);
        };
      }
      const c=JSON.parse(readFileSync(${JSON.stringify(join(workspace, 'context.json'))}));
      globalThis.fetch=async(url)=>{
        const n=url.includes('modeling-metamodel')?'modeling-metamodel':'modeling-core';
        const a=c.report.artifacts[n];
        if(url.endsWith('.tgz')) return new Response(readFileSync(join(c.directory,a.file)));
        if(url.endsWith('/0.0.3')) {
          if(!readFileSync(${JSON.stringify(events)},'utf8').includes('publish '+n)) return new Response('',{status:404});
          appendFileSync(${JSON.stringify(events)},'verify '+n+'\\n');
          return Response.json({name:a.manifest.name,version:a.artifactVersion,dist:{integrity:a.integrity,tarball:'https://registry.npmjs.org/'+n+'.tgz'}});
        }
        return Response.json({versions:{}});
      };
    `,
      );
      writeFileSync(
        join(bin, 'npm'),
        `#!/usr/bin/env node
      const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
      const args=process.argv.slice(2);
      if(args[0]==='--version') {console.log('11.19.1');process.exit(0);}
      if(args[0]==='view') {console.log(JSON.stringify({error:{code:'E404'}}));process.exit(1);}
      assert.equal(args[0],'publish');
      assert.equal(process.env.npm_config_ignore_scripts,'true');
      assert.equal(process.env.npm_config_provenance,'true');
      const m=JSON.parse(fs.readFileSync(path.join(args[1],'package.json')));
      const n=m.name.split('/')[1];
      if(n==='modeling-metamodel') assert.ok(fs.readFileSync(${JSON.stringify(events)},'utf8').includes('verify modeling-core'));
      fs.appendFileSync(${JSON.stringify(events)},'publish '+n+'\\n');
      if(process.env.TEST_FAIL_CORE==='true' && n==='modeling-core') process.exit(1);
      console.log(JSON.stringify({id:m.name+'@'+m.version,name:m.name,version:m.version,size:1,unpackedSize:1,shasum:'test',integrity:'test',filename:n+'.tgz',files:[],entryCount:0,bundled:[]}));
    `,
      );
      chmodSync(join(bin, 'npm'), 0o755);
      const env = {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        NODE_OPTIONS: `--import=${hook}`,
        NX_WORKSPACE_ROOT_PATH: workspace,
        NX_WORKSPACE_DATA_DIRECTORY: join(workspace, '.nx/workspace-data'),
        NX_DAEMON: 'false',
        NX_ISOLATE_PLUGINS: 'false',
        NX_NO_CLOUD: 'true',
        NX_LOAD_DOT_ENV_FILES: 'false',
        npm_config_ignore_scripts: 'true',
        npm_config_provenance: 'true',
        npm_config_dry_run: 'true',
      };
      for (const key of Object.keys(env))
        if (/TOKEN|SECRET|PASSWORD|PRIVATE_KEY/.test(key)) delete env[key];
      const args = [
        join(root, 'node_modules/nx/dist/bin/nx.js'),
        'release',
        'publish',
      ];
      const result = spawnSync(process.execPath, args, {
        cwd: workspace,
        env,
        encoding: 'utf8',
        timeout: 60000,
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(
        readFileSync(events, 'utf8'),
        /publish modeling-core\nverify modeling-core\n(?:verify modeling-core\n)?publish modeling-metamodel\n/,
      );
      // A failed core upload stops the dependent; Nx must not retry either package.
      writeFileSync(events, '');
      const failed = spawnSync(process.execPath, args, {
        cwd: workspace,
        env: { ...env, TEST_FAIL_CORE: 'true' },
        encoding: 'utf8',
        timeout: 60000,
      });
      assert.notEqual(failed.status, 0);
      assert.equal(readFileSync(events, 'utf8'), 'publish modeling-core\n');
    } finally {
      rmSync(context.directory, { recursive: true, force: true });
    }
  },
);

test('changed registry history and mismatched core bytes block the dependent without uploading', async () => {
  const context = fixture();
  try {
    await assert.rejects(
      publicationGate(context, 'before', 'modeling-core', async () =>
        Response.json({ versions: { '0.0.3': {} } }),
      ),
      /Registry changed/,
    );
    await assert.rejects(
      publicationGate(context, 'before', 'modeling-metamodel', async (url) =>
        url.endsWith('/0.0.3')
          ? Response.json({
              name: '@anarchitects/modeling-core',
              version: '0.0.3',
              dist: { integrity: 'wrong' },
            })
          : Response.json({ versions: {} }),
      ),
      /integrity mismatch/,
    );
    const altered = structuredClone(context.report);
    altered.artifacts['modeling-core'].sha256 = 'changed';
    assert.throws(() =>
      createPublishWorkspace(
        context.directory,
        join(context.directory, 'altered'),
        altered,
        context.histories,
        context.publishNames,
      ),
    );
  } finally {
    rmSync(context.directory, { recursive: true, force: true });
  }
});

test('metamodel-only publication excludes the support archive and requires the exact released core', async () => {
  const context = fixture();
  try {
    context.report.supportArtifacts['modeling-core'] =
      context.report.artifacts['modeling-core'];
    delete context.report.artifacts['modeling-core'];
    context.publishNames = ['modeling-metamodel'];
    const workspace = createPublishWorkspace(
      context.directory,
      join(context.directory, 'meta-only'),
      context.report,
      context.histories,
      context.publishNames,
    );
    assert.deepEqual(
      JSON.parse(readFileSync(join(workspace, 'nx.json'))).release.projects,
      ['modeling-metamodel'],
    );
    const request = async (url) =>
      url.endsWith('/0.0.3')
        ? Response.json({
            name: '@anarchitects/modeling-core',
            version: '0.0.3',
          })
        : Response.json({ versions: {} });
    await publicationGate(context, 'before', 'modeling-metamodel', request);
    await assert.rejects(
      publicationGate(context, 'before', 'modeling-metamodel', async (url) =>
        url.endsWith('/0.0.3')
          ? new Response('', { status: 404 })
          : request(url),
      ),
      /dependency unavailable/,
    );
  } finally {
    rmSync(context.directory, { recursive: true, force: true });
  }
});

test('approved recovery configures only the remaining package and verifies the original core bytes', async () => {
  const context = fixture();
  try {
    context.publishNames = ['modeling-metamodel'];
    const workspace = createPublishWorkspace(
      context.directory,
      join(context.directory, 'recovery'),
      context.report,
      context.histories,
      context.publishNames,
    );
    assert.deepEqual(
      JSON.parse(readFileSync(join(workspace, 'nx.json'))).release.projects,
      ['modeling-metamodel'],
    );
    await assert.rejects(
      publicationGate(context, 'before', 'modeling-metamodel', async (url) =>
        url.endsWith('/0.0.3')
          ? Response.json({
              name: '@anarchitects/modeling-core',
              version: '0.0.3',
              dist: { integrity: 'wrong' },
            })
          : Response.json({ versions: {} }),
      ),
      /integrity mismatch/,
    );
  } finally {
    rmSync(context.directory, { recursive: true, force: true });
  }
});

test('publisher job cannot install dependencies or run candidate builds with OIDC capability', async () => {
  const { parse } = await import('yaml');
  const workflow = parse(readFileSync('.github/workflows/publish.yml', 'utf8'));
  for (const [name, job] of Object.entries(workflow.jobs)) {
    const scripts = job.steps.map((s) => s.run ?? '').join('\n');
    if (job.permissions?.['id-token'] === 'write') {
      assert.equal(name, 'publish');
      assert.equal(job.environment, 'npm-release');
      assert.doesNotMatch(
        scripts,
        /(?:yarn|npm|pnpm)\s+(?:install|ci|exec)|nx\s+(?:run|build|test)/,
      );
      assert.match(scripts, /sha256sum --check --strict/);
    }
  }
  assert.equal(
    workflow.jobs['publisher-toolchain'].permissions['id-token'],
    undefined,
  );
  assert.match(
    workflow.jobs['publisher-toolchain'].steps
      .map((s) => s.run ?? '')
      .join('\n'),
    /yarn install --immutable --mode=skip-build/,
  );
});
