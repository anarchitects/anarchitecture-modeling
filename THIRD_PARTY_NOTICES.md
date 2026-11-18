# Third-party notices

This file retains notices for the identified copied tooling below. It does not
replace the [Apache-2.0 license for original Foundation work](LICENSE) or clear
package distribution. The candidate license and disclosure review remains tracked
in #22.

## Nx AI agent configuration

The 23 files under `.agents/skills/`, plus the adapted `.codex/config.toml` and
`.codex/agents/ci-monitor-subagent.toml`, derive from
[nrwl/nx-ai-agents-config](https://github.com/nrwl/nx-ai-agents-config/tree/13282936b5f6aa53e3d41ba589a4a2dc0d6f5786).
The upstream revision is a content-comparison reference, not a claim that the
original bootstrap downloaded that exact commit.

At the #22 baseline, 20 skill files match the upstream generated files exactly.
The other three contain only indentation or trailing-comma changes. The local
Codex configuration uses the workspace Nx MCP command, and the CI helper includes
the repository governance preflight. Preserve those local requirements when
updating the upstream tooling.

The upstream [MIT license](https://github.com/nrwl/nx-ai-agents-config/blob/13282936b5f6aa53e3d41ba589a4a2dc0d6f5786/LICENSE)
applies to that material:

```text
(The MIT License)

Copyright (c) 2017-2026 Narwhal Technologies Inc.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

These tooling files are outside the reviewed npm archive inventories. Their
notice is required for repository disclosure independently of package contents.
Installed dependencies retain their own licenses; this is not an exhaustive
dependency-license inventory or a blanket license for generated output.
