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

const getImportStatement = node => {
    if (node.type === "ImportDeclaration") {
        // Pure ESM
        return node.source.value
    }
    if (node.type === "ExpressionStatement") {
        // Import function
        if (node.expression.type === "CallExpression"
            && node.expression.callee.type === "Identifier"
            && node.expression.callee.name === "import") {
            return node.source.value
        }
        // Require function
        if (node.expression.type === "CallExpression"
            && node.expression.callee.type === "Identifier"
            && node.expression.callee.name === "require") {
            return node.source.value
        }
    }
    if (node.type === "VariableDeclaration") {
        // Require function to variable
        if (node.declarations.some(d => d.init
            && d.init.type === "CallExpression"
            && d.init.callee.type === "Identifier"
            && d.init.callee.name === "require")) {
            return node.source.value
        }
        // Import function to variable
        if (node.declarations.some(d => d.init
            && d.init.type === "CallExpression"
            && d.init.callee.type === "Identifier"
            && d.init.callee.name === "import")) {
            return node.source.value
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

const importRule = {
    "create": context => ({":statement": node => {
        const [ignored] = context.options ?? []
        const config = readJSON(join(context.cwd, "tsconfig.json"))
        if (!config) {
            return
        }
        const importPath = getImportStatement(node)
        if (!importPath) {
            return
        }
        const pathObj = config.compilerOptions.paths
        const paths = Object.keys(pathObj).map(key => key.replace("/*", ""))
            .filter(key => key !== "*" && key.startsWith("@"))
        const ownPath = relative(context.cwd, context.getFilename())
        const ownDomain = Object.keys(pathObj).find(k => {
            const path = relative(context.cwd, pathObj[k][0].replace("/*", ""))
            return ownPath.startsWith(path)
        })?.replace("/*", "")
        const importDomain = paths.find(p => importPath.startsWith(p))
            ?? Object.keys(pathObj).find(p => {
                let loc = pathObj[p][0].replace("/*", "")
                if (importPath.startsWith(loc)) {
                    return true
                }
                if (loc.startsWith("./src/")) {
                    loc = loc.replace("./src/", "./")
                    return importPath.startsWith(loc)
                }
                return false
            })?.replace("/*", "")
        if (importDomain && importDomain !== ownDomain
            && !ignored?.includes(importDomain)) {
            context.report({
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
            "import": "Module imports should not be outside their domain"
        },
        "schema": [{
            "additionalItems": false,
            "items": {
                "type": "string"
            },
            "type": "array",
            "uniqueItems": true
        }],
        "type": "problem"
    }
}

module.exports = {
    "rules": {
        "no-cross-imports": importRule
    }
}
