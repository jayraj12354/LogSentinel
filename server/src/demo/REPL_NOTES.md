# Node REPL Notes (Part 1)

Run `node` with no arguments to open the REPL. Useful for quick experiments:

```js
// Inspect globals and process
process.version
process.platform
process.cwd()

// Quick math / expressions
1 + 2 * 3
[1,2,3].map(n => n * 2)

// Require built-ins (CommonJS REPL)
const path = require('path')
path.basename('/tmp/logsentinel-part1/server/package.json')

// Async/await works in modern Node REPL
await Promise.resolve('hello')
```

Use `.help` for REPL commands, `.exit` to quit. The REPL is handy for
testing small snippets before putting them in project files.
