# Private fork CI probe

Refs anarchitects/anarchitecture-modeling#44.

This marker selects both Foundation packages through the existing CI shared
inputs. It changes no runtime behavior and is intended only for a genuine
private-fork pull-request run. Close the probe PR without merging after retaining
the sanitized event, credential-boundary and task-execution evidence.
