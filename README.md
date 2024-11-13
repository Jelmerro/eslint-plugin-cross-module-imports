eslint-plugin-cross-module-imports
==================================

### Find/prevent cross-module imports in your codebase

# Installation

`npm i -D git+https://github.com/Jelmerro/eslint-plugin-cross-module-imports.git`

Then add `cross-module-imports` to your Eslint config:

```json
{
    "plugins": [
        "cross-module-imports"
    ],
    "rules": {
        "cross-module-imports/no-cross-imports": "error"
    }
}
```

This will make sure that you can't import from a module that is not in the same base directory of the file you're importing from.
The modules are defined by default via the `tsconfig.json` file in the root of your project.
To configure the paths, inside the `tsconfig.json` file, consider some like this:

```json
{
    "compilerOptions": {
        "baseUrl": "./",
        "paths": {
            "@example/*": ["./src/example/*"],
            "@example2/*": ["./src/example2/*"]
        }
    }
}
```

If you are not using typescript, or if do not make use of the `tsconfig.json` paths,
you can also define the paths in the `.eslintrc` file:

```json
{
    "rules": {
        "cross-module-imports/no-cross-imports": [
            "error",
            {
                "domains": {
                    "@example": ["./src/example/*"],
                    "@example2": ["./src/example2/*"]
                }
            }
        ]
    }
}
```

Some modules are not a problem to import from anywhere, like `@shared` or `@components`,
these can be defined in the `.eslintrc` file as well:

```json
{
    "rules": {
        "cross-module-imports/no-cross-imports": [
            "error",
            {
                "domains": {
                    "@example": ["./src/example/*"],
                    "@example2": ["./src/example2/*"]
                },
                "shared": ["@shared", "@components"]
            }
        ]
    }
}
```

To also allow importing from one other module to the other one-way, you can define the `allowedCrossings` option:

```json
{
    "rules": {
        "cross-module-imports/no-cross-imports": [
            "error",
            {
                "domains": {
                    "@example": ["./src/example/*"],
                    "@example2": ["./src/example2/*"]
                },
                "shared": ["@shared", "@components"],
                "allowedCrossings": {
                    "@example": ["@example2"]
                }
            }
        ]
    }
}
```

Finally, if you want to disable checking files outside modules for module imports,
or if you want to disable reading the TSConfig file for the paths,
you can disable the `reportOutside` and `useTSConfig` options:

```json
{
    "rules": {
        "cross-module-imports/no-cross-imports": [
            "error",
            {
                "domains": {
                    "@example": ["./src/example/*"],
                    "@example2": ["./src/example2/*"]
                },
                "shared": ["@shared", "@components"],
                "allowedCrossings": {
                    "@example": ["@example2"]
                },
                "reportOutside": false,
                "useTSConfig": false
            }
        ]
    }
}
```

For any of the examples you can change `error` to any other warning level like `warn`.

# LICENSE

This project is created by Jelmer van Arnhem and is licensed under the MIT License.
Please see the [LICENSE](LICENSE) file for details.
