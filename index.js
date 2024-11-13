"use strict"

const {readFileSync} = require("fs")
const {join, relative} = require("path")

const readJSON = path => {
    try {
        return JSON.parse(readFileSync(path, "utf8"))
    } catch {
        return null
    }
}

const getTSConfigPaths = context => {
    const config = readJSON(join(context.cwd, "tsconfig.json"))
    const paths = {}
    for (const key of Object.keys(config?.compilerOptions?.paths ?? {})) {
        paths[key] = config.compilerOptions.paths[key]?.[0]
            ?? config.compilerOptions.paths[key]
    }
    return paths
}

const getImportStatement = node => {
    if (node.type === "ImportDeclaration") {
        // Pure ESM
        return node.source?.value
    }
    if (node.type === "ExpressionStatement") {
        // Import function
        if (node.expression.type === "CallExpression"
            && node.expression.callee.type === "Identifier"
            && node.expression.callee.name === "import") {
            return node.source?.value
        }
        // Require function
        if (node.expression.type === "CallExpression"
            && node.expression.callee.type === "Identifier"
            && node.expression.callee.name === "require") {
            return node.source?.value
        }
    }
    if (node.type === "VariableDeclaration") {
        // Require function to variable
        if (node.declarations.some(d => d.init
            && d.init.type === "CallExpression"
            && d.init.callee.type === "Identifier"
            && d.init.callee.name === "require")) {
            return node.source?.value
        }
        // Import function to variable
        if (node.declarations.some(d => d.init
            && d.init.type === "CallExpression"
            && d.init.callee.type === "Identifier"
            && d.init.callee.name === "import")) {
            return node.source?.value
        }
        // Lazy loaders
        const lazyNames = ["lazy", "lazyWithRetry", "lazily", "lazilyWithRetry"]
        const dec = node.declarations.find(d => d.init
            && d.init.type === "CallExpression"
            && d.init.callee.type === "Identifier"
            && lazyNames.includes(d.init.callee.name)
            && d.init.arguments.length > 0
            && d.init.arguments[0].body.type === "ImportExpression")
        return dec?.init.arguments[0].body.source.value
    }
    return false
}

const getOwnDomain = (context, paths) => {
    const ownPath = relative(context.cwd, context.getFilename())
    return Object.keys(paths).find(k => {
        const path = relative(context.cwd, paths[k].replace("/*", ""))
        return ownPath.startsWith(path)
    })?.replace("/*", "")
}

const getImportDomain = (importPath, paths) => {
    const pathKeys = Object.keys(paths).map(k => k.replace("/*", ""))
        .filter(k => k !== "*" && k.startsWith("@"))
    return pathKeys.find(k => importPath.startsWith(`${k}/`))
        ?? Object.keys(paths).find(k => {
            let loc = paths[k].replace("/*", "")
            if (importPath.startsWith(loc)) {
                return true
            }
            if (loc.startsWith("./src/")) {
                loc = loc.replace("./src/", "./")
                return importPath.startsWith(loc)
            }
            return false
        })?.replace("/*", "")
}

const importRule = {
    "create": context => ({":statement": node => {
        const opts = context.options?.[0] ?? {}
        let paths = {}
        if (opts.useTSConfig) {
            paths = {...paths, ...getTSConfigPaths(context)}
        }
        if (opts.domains) {
            paths = {...paths, ...opts.domains}
        }
        if (!Object.keys(paths).length) {
            return
        }
        const importPath = getImportStatement(node)
        if (!importPath) {
            return
        }
        const ownDomain = getOwnDomain(context, paths)
        const importDomain = getImportDomain(importPath, paths)
        if (opts.shared?.includes(importDomain)) {
            // Ignore modules in the shared list from being reported
            return
        }
        if (!opts.reportOutside && !ownDomain) {
            // Ignore if no domain is found for the file
            return
        }
        if (opts.allowedCrossings?.[ownDomain]?.includes(importDomain)) {
            // Ignore if the crossing is allowed
            return
        }
        if (importDomain && importDomain !== ownDomain) {
            // Report if the import of a domain and not part of this domain
            context.report({
                "data": {
                    "imdomain": importDomain,
                    "owndomain": ownDomain ?? "<none>",
                    "path": importPath
                },
                "messageId": "import",
                node
            })
        }
    }}),
    "meta": {
        "docs": {
            "description": "Find/prevent cross-module imports in your codebase",
            "recommended": true,
            "url": "https://github.com/Jelmerro/eslint-plugin-cross-module-imports"
        },
        "messages": {
            "import": "{{ path }} of {{ imdomain }} is outside {{ owndomain }}"
        },
        "schema": [{
            "properties": {
                "allowedCrossings": {
                    "patternProperties": {
                        ".*": {
                            "additionalItems": false,
                            "items": {
                                "type": "string"
                            },
                            "type": "array",
                            "uniqueItems": true
                        }
                    },
                    "type": "object"
                },
                "domains": {
                    "patternProperties": {
                        ".*": {
                            "items": {
                                "type": "string"
                            },
                            "type": "string"
                        }
                    },
                    "type": "object"
                },
                "reportOutside": {
                    "default": true,
                    "type": "boolean"
                },
                "shared": {
                    "additionalItems": false,
                    "items": {
                        "type": "string"
                    },
                    "type": "array",
                    "uniqueItems": true
                },
                "useTSConfig": {
                    "default": true,
                    "type": "boolean"
                }
            },
            "type": "object"
        }],
        "type": "problem"
    }
}

module.exports = {
    "rules": {
        "no-cross-imports": importRule
    }
}
