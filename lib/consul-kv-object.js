"use strict";

const flagMap = [
    String, Number, Boolean, Date
];

function consulKvObjectForge(kv) {
    if (!(kv && ['get', 'set', 'del'].every(k => kv[k] instanceof Function))) {
        throw new Error('constructing consul-kv-object requires consul.kv as argument');
    }

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
    function assembleConsulResponse(err, res, prefix, callback) {
        const prefixLen = (prefix.substr(-1) === '/'
            ? prefix.length - 1
            : prefix.length);

        if (err) {
            callback(err, null);
        }
        else {
            var response = res.reduce(function (assembly, consulKey) {
                var keyPath = consulKey.Key.substr(prefixLen).split('/');
                var key = keyPath.pop();

                var at = keyPath
                    .filter( key => !!key )
                    .reduce(function (at, key) {
                        if (!at[key]) {
                            at[key] = {};
                        }
                        return at[key];

                    }, assembly);

                if (key !== "") {
                    var stringValue = consulKey.Value;
                    var type = flagMap[consulKey.Flags] || String;
                    var value = type(stringValue);
                    at[key] = value;
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