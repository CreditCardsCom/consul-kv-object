"use strict";

const defaultFlagMap = [
    s=>String(s),
    s=>Number(s),
    s=>Boolean(s),
    s=>new Date(s)
];

const defaultOptions = {
    mapTypes: true,
    typeMapFlags: defaultFlagMap,
    defaultType: defaultFlagMap[0]
}

function consulKvObjectForge(kv, userOptions) {
    if (!(kv && ['get', 'set', 'del'].every(k => kv[k] instanceof Function))) {
        throw new Error('constructing consul-kv-object requires consul.kv as argument');
    }
    var options = Object.keys(userOptions || {})
        .reduce(
            function (options, userKey) {
                options[userKey] = userOptions[userKey];
                return options;
            }, defaultOptions);


    function wrapCosnsulOptions(param) {
        if (param instanceof Object) {
            param.recurse = true;
            return param;
        }
        return {
            key: param,
            recurse: true
        }
    }
    function createValue(consulKey) {
        if (options.typeMapFlags && options.mapTypes) {
            var type = options.typeMapFlags[consulKey.Flags] || options.defaultType || String;
            var value = type(consulKey.Value);
            return value;
        } else {
            return consulKey.Value;
        }
    }

    function assembleConsulResponse(err, res, prefix, callback) {
        const prefixLen = (prefix.substr(-1) === '/'
            ? prefix.length - 1
            : prefix.length);

        if (err) {
            callback(err, null);
        }
        else {
            var response = res.reduce(function reducePathToObject(assembly, consulKey) {
                var keyPath = consulKey.Key.substr(prefixLen).split('/');
                var key = keyPath.pop();

                var at = keyPath
                    .filter(key => !!key)
                    .reduce(function (at, key) {
                        if (!at[key]) {
                            at[key] = {};
                        }
                        return at[key];
                    }, assembly);
                if (key !== "") {
                    at[key] = createValue(consulKey);
                }
                if (key === "" && keyPath.length===0 ){
                    return createValue(consulKey);
                }
                return assembly;
            }, {});
            callback(null, response);
        }
    }

    function get(options, callback) {
        const consulOptions = wrapCosnsulOptions(options);
        return kv.get(consulOptions, function (err, res) {
            assembleConsulResponse(err, res, consulOptions.key || "", callback)
        });
    }

    function set(options, callback) {

    }
    function del(options, callback) {

    }

    var cko = {
        "get": get,
        "set": set,
        "del": del
    };
    return cko;
}

module.exports = consulKvObjectForge; 