eslint-plugin-cross-module-imports
==================================

### Find/prevent cross-module imports in your codebase

# Installation

Install the package (either in `~` or in your project dir) using:

`npm i -D git+https://github.com/Jelmerro/eslint-plugin-cross-module-imports.git`

Add `cross-module-imports` to your Eslint config:

```json
{
    "plugins": [
        "cross-module-imports"
    ],
    "rules": {
        "cross-module-imports": "error"
    }
}
```

That's it!

# LICENSE

This project is created by Jelmer van Arnhem and is licensed under the MIT License.
Please see the [LICENSE](LICENSE) file for details.
