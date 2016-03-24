"use strict";

const Promise = require('bluebird');

const defaultFlagMap = [
    { match: String, make: String, guess: s => s!==null },
    { match: Number, make: Number, guess: s => s!==null && !isNaN(s) },
    { match: Boolean, make: s => s === 'true', guess: s => (s === 'true' || s === 'false') },
    { match: Date, make: s=> new Date(s), guess: function(s) {
        if ( !s ) return false;
        if ( !s.match(/[0-9]{4}.*([0-9]{2}:[0-9]{2})?/)) return false;
        var t=new Date(s).getTime();
        if ( t===0 || isNaN(t) || t>=9999999999999 ) return false;
        return true;
    }}
];

const defaultOptions = {
    mapTypes: true,
    guessTypes: false,
    typeMapFlags: defaultFlagMap,
    defaultType: defaultFlagMap[0]
}

function consulKvObjectForge(kvSync, userOptions) {
    if (!(kvSync && ['get', 'set', 'del'].every(k => kvSync[k] instanceof Function))) {
        throw new Error('constructing consul-kv-object requires consul.kv as argument');
    }
    const kv = Promise.promisifyAll(kvSync);

    var consulObjectOptions = Object.keys(defaultOptions)
        .reduce(
            function (options, defaultKey) {
                if (options[defaultKey] === undefined) {
                    options[defaultKey] = defaultOptions[defaultKey];
                }
                return options;
            }, userOptions || {});

    function wrapCosnsulOptions(param, key, value, flags, recurse) {
        var ret;
        if (param instanceof Object) {
            ret = param;
        } else {
            ret = {
                key: param
            }
        }
        if (key !== undefined) {
            ret.key = key;
        }
        if (value !== undefined) {
            ret.value = value;
        }
        if (flags !== undefined) {
            ret.flags = flags;
        }
        if (recurse !== undefined) {
            ret.recurse = true;
        }
        return ret;
    }
    function createValue(consulKey) {
        //
        // Creates javascript value based on consulObjectOptions, consul flags and flagMap
        //
        if (consulKey.Value === null) return null;
        
        if (consulObjectOptions.typeMapFlags && consulObjectOptions.mapTypes) {
            let type;
            if (consulKey.Flags === 0 && consulObjectOptions.guessTypes) {
                type = consulObjectOptions.typeMapFlags.filter(tmf => tmf.guess && tmf.guess(consulKey.Value)).pop().make;
            } else {
                type = (consulObjectOptions.typeMapFlags[consulKey.Flags] || consulObjectOptions.defaultType || {}).make;
            }
            let value = type(consulKey.Value);
            return value;
        } else {
            return consulKey.Value;
        }
    }
    function createKey(value, prefix) {
        var flag = 0;
        if (consulObjectOptions.typeMapFlags && consulObjectOptions.mapTypes) {

            if ( value !== null ) {
                flag = consulObjectOptions.typeMapFlags
                    .map(m => m.match)
                    .indexOf(value.constructor);
            }
        }

        return { key: prefix, value: value === null ? null : value.toString(), flag: flag }
    }

    function objectToKeyList(object, prefix) {
        if (object !== null && object.constructor === Object) {
            return Array.prototype.concat.apply(
                [],
                Object.keys(object)
                    .map(key => objectToKeyList(object[key], (prefix ? prefix + "/" : "") + key)));

        } else {
            return [createKey(object, prefix)];
        }

    }

    function consulResponseToObject(err, res, prefix, callback) {
        // 
        // Converts consul response into object
        // 
        const prefixLen = (prefix.substr(-1) === '/'
            ? prefix.length - 1
            : prefix.length);

        if (err) {
            callback(err, null);
        }
        else {
            if (res === undefined) {
                callback(null, undefined);
                return;
            }
            var response = res.reduce(function reducePathToObject(assembly, consulKey) {
                var keyPath = consulKey.Key.substr(prefixLen).split('/');
                var key = keyPath.pop();

                var at = keyPath
                    .filter(key => !!key)
                    .reduce(function (at, key) {
                        if (at[key] === undefined) {
                            at[key] = {};
                        }
                        return at[key];
                    }, assembly);
                if (key !== "") {
                    at[key] = createValue(consulKey);
                }
                if (key === "" && keyPath.length === 0) {
                    return createValue(consulKey);
                }
                return assembly;
            }, {});
            callback(null, response);
        }
    }

    function get(keyOptions, callback) {
        const consulRequestOptions = wrapCosnsulOptions(keyOptions, undefined, undefined, undefined, true);
        return kv.get(consulRequestOptions, function (err, res) {
            consulResponseToObject(err, res, consulRequestOptions.key, callback);
        });
    }

    function set(keyOptions, values, callback) {
        const consulRequestOptions = wrapCosnsulOptions(keyOptions);
        const keyList = objectToKeyList(values, consulRequestOptions.key);
        const promisedSet = keyList.map(function (o) {
            var options = wrapCosnsulOptions({}, o.key, o.value, o.flag);
            return kv.setAsync(options);
        });

        if (callback) {
            return Promise.all(promisedSet).then((data) => callback(null, data));
        }
    }
    function del(keyOptions, callback) {
        const consulRequestOptions = wrapCosnsulOptions(keyOptions, undefined, undefined, undefined, true);
        return kv.del(consulRequestOptions, callback || (() => { }));
    }

    var cko = {
        "get": get,
        "set": set,
        "del": del
    };
    return cko;
}

module.exports = consulKvObjectForge; 