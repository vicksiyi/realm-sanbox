(function (global, factory) {
    "object" == typeof exports && "undefined" != typeof module ? module.exports = factory() : "function" == typeof define && define.amd ? define(factory) : (global = global || self,
        global.Realm = factory())
}
)(this, function () {
    'use strict';
    function throwTantrum(s, err = void 0) {
        const msg = `please report internal shim error: ${s}`;
        console.error(msg),
            err && (console.error(`${err}`),
                console.error(`${err.stack}`));
        debugger; throw msg
    }
    function assert(condition, message) {
        condition || throwTantrum(message)
    }
    function cleanupSource(src) {
        return src = src.replace(/\(0,\s*_[^.]+\.e\)/g, "(0, eval)"),
            src = src.replace(/_[^.]+\.g\.Reflect/g, "Reflect"),
            src = src.replace(/cov_[^+]+\+\+[;,]/g, ""),
            src
    }
    function buildChildRealm(unsafeRec, BaseRealm) {
        const { callAndWrapError } = unsafeRec
            , { initRootRealm, initCompartment, getRealmGlobal, realmEvaluate } = BaseRealm
            , { create, defineProperties } = Object;
        class Realm {
            constructor() {
                throw new TypeError("Realm is not a constructor")
            }
            static makeRootRealm(options = {}) {
                const r = create(Realm.prototype);
                return callAndWrapError(initRootRealm, [unsafeRec, r, options]),
                    r
            }
            static makeCompartment(options = {}) {
                const r = create(Realm.prototype);
                return callAndWrapError(initCompartment, [unsafeRec, r, options]),
                    r
            }
            get global() {
                return callAndWrapError(getRealmGlobal, [this])
            }
            evaluate(x, endowments, options = {}) {
                return callAndWrapError(realmEvaluate, [this, x, endowments, options])
            }
        }
        return defineProperties(Realm, {
            toString: {
                value: () => "function Realm() { [shim code] }",
                writable: !1,
                enumerable: !1,
                configurable: !0
            }
        }),
            defineProperties(Realm.prototype, {
                toString: {
                    value: () => "[object Realm]",
                    writable: !1,
                    enumerable: !1,
                    configurable: !0
                }
            }),
            Realm
    }
    function createRealmFacade(unsafeRec, BaseRealm) {
        const { unsafeEval } = unsafeRec;
        return unsafeEval(buildChildRealmString)(unsafeRec, BaseRealm)
    }
    function createCallAndWrapError(unsafeEval) {
        return unsafeEval(buildCallAndWrapErrorString)()
    }
    /**
     * Share properties with the global
     * and set attribute desc
     */
    function getSharedGlobalDescs(unsafeGlobal) {
        function describe(names, writable, enumerable, configurable) {
            for (const name of names) {
                const desc = getOwnPropertyDescriptor(unsafeGlobal, name);
                desc && (assert("value" in desc, `unexpected accessor on global property: ${name}`),
                    descriptors[name] = {
                        value: desc.value,
                        writable,
                        enumerable,
                        configurable
                    })
            }
        }
        const descriptors = {};
        return describe(frozenGlobalPropertyNames, !1, !1, !1),
            describe(stableGlobalPropertyNames, !1, !1, !1),
            describe(unstableGlobalPropertyNames, !0, !1, !0),
            descriptors
    }
    function repairAccessors() {
        function toObject(obj) {
            if (obj === void 0 || null === obj)
                throw new TypeError(`can't convert undefined or null to object`);
            return Object(obj)
        }
        function asPropertyName(obj) {
            return "symbol" == typeof obj ? obj : `${obj}`
        }
        function aFunction(obj, accessor) {
            if ("function" != typeof obj)
                throw TypeError(`invalid ${accessor} usage`);
            return obj
        }
        const { defineProperty, defineProperties, getOwnPropertyDescriptor, getPrototypeOf, prototype: objectPrototype } = Object;
        try {
            (0,
                objectPrototype.__lookupGetter__)("x")
        } catch (ignore) {
            return
        }
        defineProperties(objectPrototype, {
            __defineGetter__: {
                value: function (prop, func) {
                    const O = toObject(this);
                    defineProperty(O, prop, {
                        get: aFunction(func, "getter"),
                        enumerable: !0,
                        configurable: !0
                    })
                }
            },
            __defineSetter__: {
                value: function (prop, func) {
                    const O = toObject(this);
                    defineProperty(O, prop, {
                        set: aFunction(func, "setter"),
                        enumerable: !0,
                        configurable: !0
                    })
                }
            },
            __lookupGetter__: {
                value: function (prop) {
                    let O = toObject(this);
                    prop = asPropertyName(prop);
                    let desc;
                    for (; O && !(desc = getOwnPropertyDescriptor(O, prop));)
                        O = getPrototypeOf(O);
                    return desc && desc.get
                }
            },
            __lookupSetter__: {
                value: function (prop) {
                    let O = toObject(this);
                    prop = asPropertyName(prop);
                    let desc;
                    for (; O && !(desc = getOwnPropertyDescriptor(O, prop));)
                        O = getPrototypeOf(O);
                    return desc && desc.set
                }
            }
        })
    }
    function repairFunctions() {
        function repairFunction(name, declaration) {
            let FunctionInstance;
            try {
                FunctionInstance = (0,
                    eval)(declaration)
            } catch (e) {
                if (e instanceof SyntaxError)
                    return;
                throw e
            }
            const FunctionPrototype = getPrototypeOf(FunctionInstance)
                , TamedFunction = function () {
                    throw new TypeError("Not available")
                };
            defineProperties(TamedFunction, {
                name: {
                    value: name
                }
            }),
                defineProperties(FunctionPrototype, {
                    constructor: {
                        value: TamedFunction
                    }
                }),
                defineProperties(TamedFunction, {
                    prototype: {
                        value: FunctionPrototype
                    }
                }),
                TamedFunction !== Function.prototype.constructor && setPrototypeOf(TamedFunction, Function.prototype.constructor)
        }
        const { defineProperties, getPrototypeOf, setPrototypeOf } = Object;
        repairFunction("Function", "(function(){})"),
            repairFunction("GeneratorFunction", "(function*(){})"),
            repairFunction("AsyncFunction", "(async function(){})"),
            repairFunction("AsyncGeneratorFunction", "(async function*(){})")
    }
    function createNewUnsafeGlobalForNode() {
        const isNode = new Function("try {return this===global}catch(e){return false}")();
        if (!isNode)
            return;
        const vm = require("vm")
            , unsafeGlobal = vm.runInNewContext(unsafeGlobalEvalSrc);
        return unsafeGlobal
    }
    function createNewUnsafeGlobalForBrowser() {
        if ("undefined" != typeof document) {
            const iframe = document.createElement("iframe");
            iframe.style.display = "none",
                document.body.appendChild(iframe);
            const unsafeGlobal = iframe.contentWindow.eval(unsafeGlobalSrc);
            return unsafeGlobal
        }
    }
    function createUnsafeRec(unsafeGlobal, allShims = []) {
        const sharedGlobalDescs = getSharedGlobalDescs(unsafeGlobal)
            , unsafeEval = unsafeGlobal.eval
            , unsafeFunction = unsafeGlobal.Function
            , callAndWrapError = createCallAndWrapError(unsafeEval);
        return freeze({
            unsafeGlobal,
            sharedGlobalDescs,
            unsafeEval,
            unsafeFunction,
            callAndWrapError,
            allShims
        })
    }
    function createNewUnsafeRec(allShims) {
        const unsafeGlobal = getNewUnsafeGlobal();
        return unsafeGlobal.eval(repairAccessorsShim),
            unsafeGlobal.eval(repairFunctionsShim),
            createUnsafeRec(unsafeGlobal, allShims)
    }
    function getOptimizableGlobals(safeGlobal) {
        const descs = getOwnPropertyDescriptors(safeGlobal)
            , constants = arrayFilter(getOwnPropertyNames(descs), name => {
                if ("eval" === name || keywords.has(name) || !regexpTest(identifierPattern, name))
                    return !1;
                const desc = descs[name];
                return !1 === desc.configurable && !1 === desc.writable && objectHasOwnProperty(desc, "value")
            }
            );
        return constants
    }
    function createScopeHandler(unsafeRec, safeGlobal, endowments, sloppyGlobals) {
        const { unsafeEval } = unsafeRec;
        return unsafeEval(buildScopeHandlerString)(unsafeRec, safeGlobal, endowments, sloppyGlobals)
    }
    function createSafeEval(unsafeRec, safeEvalOperation) {
        const { unsafeEval } = unsafeRec;
        return unsafeEval(buildSafeEvalString)(unsafeRec, safeEvalOperation)
    }
    function createSafeFunction(unsafeRec, safeFunctionOperation) {
        const { unsafeEval } = unsafeRec;
        return unsafeEval(buildSafeFunctionString)(unsafeRec, safeFunctionOperation)
    }
    function rejectImportExpressions(s) {
        const index = s.search(importPattern);
        if (-1 !== index) {
            const linenum = s.slice(0, index).split("\n").length;
            throw new SyntaxError(`possible import expression rejected around line ${linenum}`)
        }
    }
    function rejectDangerousSources(s) {
        rejectImportExpressions(s)
    }
    function buildOptimizer(constants) {
        return 0 === constants.length ? "" : `const {${arrayJoin(constants, ",")}} = this;`
    }
    /**
     * core-sanbox
     */
    function createScopedEvaluatorFactory(unsafeRec, constants) {
        const { unsafeFunction } = unsafeRec
            , optimizer = buildOptimizer(constants);
        return unsafeFunction(`
    with (arguments[0]) {
      ${optimizer}
      return function() {
        'use strict';
        return eval(arguments[0]);
      };
    }
  `)
    }
    function applyTransforms(rewriterState, transforms) {
        return rewriterState = {
            src: `${rewriterState.src}`,
            endowments: create(null, getOwnPropertyDescriptors(rewriterState.endowments))
        },
            rewriterState = transforms.reduce((rs, transform) => transform.rewrite ? transform.rewrite(rs) : rs, rewriterState),
            rewriterState = {
                src: `${rewriterState.src}`,
                endowments: create(null, getOwnPropertyDescriptors(rewriterState.endowments))
            },
            rewriterState
    }
    /**
     * safe eval factory
     * [with and proxy]
     * scopeProxy is with scope
     */
    function createSafeEvaluatorFactory(unsafeRec, safeGlobal, transforms, sloppyGlobals) {
        const constants = getOptimizableGlobals(safeGlobal)
            , scopedEvaluatorFactory = createScopedEvaluatorFactory(unsafeRec, constants);
        return function (endowments = {}, options = {}) {
            const localTransforms = options.transforms || []
                , allTransforms = arrayConcat(localTransforms, transforms || [], [rejectDangerousSourcesTransform]);
            return function (src) {
                let rewriterState = {
                    src,
                    endowments
                };
                rewriterState = applyTransforms(rewriterState, allTransforms);
                const scopeHandler = createScopeHandler(unsafeRec, safeGlobal, rewriterState.endowments, sloppyGlobals)
                    , scopeProxyRevocable = Proxy.revocable({}, scopeHandler)
                    , scopeProxy = scopeProxyRevocable.proxy
                    , scopedEvaluator = apply(scopedEvaluatorFactory, safeGlobal, [scopeProxy]);
                scopeHandler.useUnsafeEvaluator = !0;
                let err;
                try {
                    /**
                     * this->safeGlobal
                     * with scope->scopeProxy
                     */
                    return apply(scopedEvaluator, safeGlobal, [rewriterState.src])
                } catch (e) {
                    throw err = e,
                    e
                } finally {
                    scopeHandler.useUnsafeEvaluator && (scopeProxyRevocable.revoke(),
                        throwTantrum("handler did not revoke useUnsafeEvaluator", err))
                }
            }
        }
    }
    function createSafeEvaluator(unsafeRec, safeEvalOperation) {
        const { unsafeFunction } = unsafeRec
            , safeEval = createSafeEval(unsafeRec, safeEvalOperation);
        return assert(getPrototypeOf(safeEval).constructor !== Function, "hide Function"),
            assert(getPrototypeOf(safeEval).constructor !== unsafeFunction, "hide unsafeFunction"),
            safeEval
    }
    function createSafeEvaluatorWhichTakesEndowments(safeEvaluatorFactory) {
        return (x, endowments, options = {}) => safeEvaluatorFactory(endowments, options)(x)
    }
    function createFunctionEvaluator(unsafeRec, safeEvalOperation) {
        const { unsafeGlobal, unsafeFunction } = unsafeRec
            , safeFunction = createSafeFunction(unsafeRec, function (...params) {
                const functionBody = `${arrayPop(params) || ""}`;
                let functionParams = `${arrayJoin(params, ",")}`;
                if (!regexpTest(/^[\w\s,]*$/, functionParams))
                    throw new SyntaxError("shim limitation: Function arg must be simple ASCII identifiers, possibly separated by commas: no default values, pattern matches, or non-ASCII parameter names");
                if (new unsafeFunction(functionBody),
                    stringIncludes(functionParams, ")"))
                    throw new unsafeGlobal.SyntaxError("shim limitation: Function arg string contains parenthesis");
                0 < functionParams.length && (functionParams += "\n/*``*/");
                const src = `(function(${functionParams}){\n${functionBody}\n})`;
                return safeEvalOperation(src)
            });
        return assert(getPrototypeOf(safeFunction).constructor !== Function, "hide Function"),
            assert(getPrototypeOf(safeFunction).constructor !== unsafeFunction, "hide unsafeFunction"),
            safeFunction
    }
    function getRealmRecForRealmInstance(realm) {
        return assert(Object(realm) === realm, "bad object, not a Realm instance"),
            assert(RealmRecForRealmInstance.has(realm), "Realm instance has no record"),
            RealmRecForRealmInstance.get(realm)
    }
    function registerRealmRecForRealmInstance(realm, realmRec) {
        assert(Object(realm) === realm, "bad object, not a Realm instance"),
            assert(!RealmRecForRealmInstance.has(realm), "Realm instance already has a record"),
            RealmRecForRealmInstance.set(realm, realmRec)
    }
    function setDefaultBindings(safeGlobal, safeEval, safeFunction) {
        defineProperties(safeGlobal, {
            eval: {
                value: safeEval,
                writable: !0,
                configurable: !0
            },
            Function: {
                value: safeFunction,
                writable: !0,
                configurable: !0
            }
        })
    }
    /**
     * [core]Realm
     */
    function createRealmRec(unsafeRec, transforms, sloppyGlobals) {
        const { sharedGlobalDescs, unsafeGlobal } = unsafeRec
            , safeGlobal = create(unsafeGlobal.Object.prototype, sharedGlobalDescs)
            , safeEvaluatorFactory = createSafeEvaluatorFactory(unsafeRec, safeGlobal, transforms, sloppyGlobals)
            , safeEvalOperation = safeEvaluatorFactory()
            , safeEval = createSafeEvaluator(unsafeRec, safeEvalOperation)
            , safeFunction = createFunctionEvaluator(unsafeRec, safeEvalOperation)
            , safeEvalWhichTakesEndowments = createSafeEvaluatorWhichTakesEndowments(safeEvaluatorFactory);
        setDefaultBindings(safeGlobal, safeEval, safeFunction);
        const realmRec = freeze({
            safeGlobal,
            safeEval,
            safeEvalWhichTakesEndowments,
            safeFunction
        });
        return realmRec
    }
    const buildChildRealmString = cleanupSource(`'use strict'; (${buildChildRealm})`)
        , buildCallAndWrapErrorString = cleanupSource(`'use strict'; (${function () {
            const { getPrototypeOf } = Object
                , { apply } = Reflect
                , uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args)
                , mapGet = uncurryThis(Map.prototype.get)
                , setHas = uncurryThis(Set.prototype.has)
                , errorNameToErrorConstructor = new Map([["EvalError", EvalError], ["RangeError", RangeError], ["ReferenceError", ReferenceError], ["SyntaxError", SyntaxError], ["TypeError", TypeError], ["URIError", URIError]])
                , errorConstructors = new Set([EvalError.prototype, RangeError.prototype, ReferenceError.prototype, SyntaxError.prototype, TypeError.prototype, URIError.prototype, Error.prototype]);
            return function (target, args) {
                try {
                    return apply(target, void 0, args)
                } catch (err) {
                    if (Object(err) !== err)
                        throw err;
                    if (setHas(errorConstructors, getPrototypeOf(err)))
                        throw err;
                    let eName, eMessage, eStack;
                    try {
                        eName = `${err.name}`,
                            eMessage = `${err.message}`,
                            eStack = `${err.stack || eMessage}`
                    } catch (ignored) {
                        throw new Error("unknown error")
                    }
                    const ErrorConstructor = mapGet(errorNameToErrorConstructor, eName) || Error;
                    try {
                        throw new ErrorConstructor(eMessage)
                    } catch (err2) {
                        throw err2.stack = eStack,
                        err2
                    }
                }
            }
        }
            })`)
        , { assign, create, freeze, defineProperties, getOwnPropertyDescriptor, getOwnPropertyDescriptors, getOwnPropertyNames, getPrototypeOf, setPrototypeOf } = Object
        , { apply, ownKeys } = Reflect
        , uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args)
        , objectHasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty)
        , arrayFilter = uncurryThis(Array.prototype.filter)
        , arrayPop = uncurryThis(Array.prototype.pop)
        , arrayJoin = uncurryThis(Array.prototype.join)
        , arrayConcat = uncurryThis(Array.prototype.concat)
        , regexpTest = uncurryThis(RegExp.prototype.test)
        , stringIncludes = uncurryThis(String.prototype.includes)
        , frozenGlobalPropertyNames = ["Infinity", "NaN", "undefined"]
        , stableGlobalPropertyNames = ["isFinite", "isNaN", "parseFloat", "parseInt", "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent", "Array", "ArrayBuffer", "Boolean", "DataView", "EvalError", "Float32Array", "Float64Array", "Int8Array", "Int16Array", "Int32Array", "Map", "Number", "Object", "RangeError", "ReferenceError", "Set", "String", "Symbol", "SyntaxError", "TypeError", "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "URIError", "WeakMap", "WeakSet", "JSON", "Math", "Reflect", "escape", "unescape"]
        , unstableGlobalPropertyNames = ["Date", "Error", "Promise", "Proxy", "RegExp", "Intl"]
        , unsafeGlobalSrc = "'use strict'; this"
        , unsafeGlobalEvalSrc = `(0, eval)("'use strict'; this")`
        , getNewUnsafeGlobal = () => {
            const newUnsafeGlobalForBrowser = createNewUnsafeGlobalForBrowser()
                , newUnsafeGlobalForNode = createNewUnsafeGlobalForNode();
            if (!newUnsafeGlobalForBrowser && !newUnsafeGlobalForNode || newUnsafeGlobalForBrowser && newUnsafeGlobalForNode)
                throw new Error("unexpected platform, unable to create Realm");
            return newUnsafeGlobalForBrowser || newUnsafeGlobalForNode
        }
        , repairAccessorsShim = cleanupSource(`"use strict"; (${repairAccessors})();`)
        , repairFunctionsShim = cleanupSource(`"use strict"; (${repairFunctions})();`)
        , identifierPattern = /^[a-zA-Z_$][\w$]*$/
        , keywords = new Set(["await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in", "instanceof", "new", "return", "super", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield", "let", "static", "enum", "implements", "package", "protected", "interface", "private", "public", "await", "null", "true", "false", "this", "arguments"])
        /**
         * build proxy handler [with-scope]
         */
        , buildScopeHandlerString = cleanupSource(`'use strict'; (${function (unsafeRec, safeGlobal, endowments = {}, sloppyGlobals = !1) {
            const { unsafeGlobal, unsafeEval } = unsafeRec
                , { freeze } = Object
                , { get: reflectGet } = Reflect
                , { unscopables } = Symbol
                , alwaysThrowHandler = new Proxy(freeze({}), {
                    get(target, prop) {
                        throw new TypeError(`unexpected scope handler trap called: ${prop + ""}`)
                    }
                });
            return {
                __proto__: alwaysThrowHandler,
                getPrototypeOf() {
                    return alwaysThrowHandler
                },
                useUnsafeEvaluator: !1,
                get(shadow, prop) {
                    return prop === unscopables ? void 0 : "eval" === prop && !0 === this.useUnsafeEvaluator ? (this.useUnsafeEvaluator = !1,
                        unsafeEval) : prop in endowments ? reflectGet(endowments, prop, safeGlobal) : prop in safeGlobal ? safeGlobal[prop] : void 0
                },
                set(shadow, prop, value) {
                    if (prop in endowments)
                        throw new TypeError(`do not modify endowments like ${prop + ""}`);
                    return safeGlobal[prop] = value,
                        !0
                },
                has(shadow, prop) {
                    return !!sloppyGlobals || !!("eval" === prop || prop in endowments || prop in safeGlobal || prop in unsafeGlobal)
                },
                getPrototypeOf() {
                    return null
                }
            }
        }
            })`)
        , buildSafeEvalString = cleanupSource(`'use strict'; (${function (unsafeRec, safeEvalOperation) {
            const { callAndWrapError } = unsafeRec
                , { defineProperties } = Object
                , safeEval = {
                    eval() {
                        return callAndWrapError(safeEvalOperation, arguments)
                    }
                }.eval;
            return defineProperties(safeEval, {
                toString: {
                    value: () => `function ${"eval"}() { [shim code] }`,
                    writable: !1,
                    enumerable: !1,
                    configurable: !0
                }
            }),
                safeEval
        }
            })`)
        , buildSafeFunctionString = cleanupSource(`'use strict'; (${function (unsafeRec, safeFunctionOperation) {
            const { callAndWrapError, unsafeFunction } = unsafeRec
                , { defineProperties } = Object
                , safeFunction = function () {
                    return callAndWrapError(safeFunctionOperation, arguments)
                };
            return defineProperties(safeFunction, {
                prototype: {
                    value: unsafeFunction.prototype
                },
                toString: {
                    value: () => "function Function() { [shim code] }",
                    writable: !1,
                    enumerable: !1,
                    configurable: !0
                }
            }),
                safeFunction
        }
            })`)
        , importPattern = /\bimport\s*(?:\(|\/[/*]|<!--|-->)/
        , rejectDangerousSourcesTransform = {
            rewrite(rs) {
                return rejectDangerousSources(rs.src),
                    rs
            }
        }
        , RealmRecForRealmInstance = new WeakMap
        , BaseRealm = {
            initRootRealm: function (parentUnsafeRec, self, options) {
                const { shims: newShims, transforms, sloppyGlobals } = options
                    , allShims = arrayConcat(parentUnsafeRec.allShims, newShims)
                    , unsafeRec = createNewUnsafeRec(allShims)
                    , Realm = createRealmFacade(unsafeRec, BaseRealm)
                    , realmRec = createRealmRec(unsafeRec, transforms, sloppyGlobals)
                    , { safeEvalWhichTakesEndowments } = realmRec;
                for (const shim of allShims)
                    safeEvalWhichTakesEndowments(shim);
                registerRealmRecForRealmInstance(self, realmRec)
            },
            initCompartment: function (unsafeRec, self, options = {}) {
                const { transforms, sloppyGlobals } = options
                    , realmRec = createRealmRec(unsafeRec, transforms, sloppyGlobals);
                registerRealmRecForRealmInstance(self, realmRec)
            },
            getRealmGlobal: function (self) {
                const { safeGlobal } = getRealmRecForRealmInstance(self);
                return safeGlobal
            },
            realmEvaluate: function (self, x, endowments = {}, options = {}) {
                const { safeEvalWhichTakesEndowments } = getRealmRecForRealmInstance(self);
                return safeEvalWhichTakesEndowments(x, endowments, options)
            }
        }
        , currentUnsafeRec = function () {
            const unsafeGlobal = (0,
                eval)(unsafeGlobalSrc);
            return repairAccessors(),
                repairFunctions(),
                createUnsafeRec(unsafeGlobal)
        }()
        , Realm = buildChildRealm(currentUnsafeRec, BaseRealm);
    return Realm
});