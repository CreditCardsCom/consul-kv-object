"use strict";

const Promise = require('bluebird');

const defaultFlagMap = [
    { match: String, make: String },
    { match: Number, make: Number },
    { match: Boolean, make: Boolean },
    { match: Date, make: s=> new Date(s) }
];

const defaultOptions = {
    mapTypes: true,
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

    function wrapCosnsulOptions(param, key, value, flag, recurse) {
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
        if (flag !== undefined) {
            ret.flag = flag;
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
        if (consulObjectOptions.typeMapFlags && consulObjectOptions.mapTypes) {
            var type = (consulObjectOptions.typeMapFlags[consulKey.Flags] || consulObjectOptions.defaultType || {}).make;
            var value = type(consulKey.Value);
            return value;
        } else {
            return consulKey.Value;
        }
    }
    function createKey(value, prefix) {
        var flag = 0;
        if (consulObjectOptions.typeMapFlags && consulObjectOptions.mapTypes) {

            flag = consulObjectOptions.typeMapFlags
                .map(m => m.match)
                .indexOf(value.constructor);
        }

        return { key: prefix, value: value.toString(), flag: flag }
    }

    function objectToKeyList(object, prefix) {
        if (object.constructor === Object) {
            return Array.prototype.concat.apply(
                [ { key: prefix+"/", flag: 0 } ],
                Object.keys(object)
                    .map( key => objectToKeyList(object[key], prefix + "/" + key)));

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
            var options = wrapCosnsulOptions({}, o.key, o.value, o.flag );
            return kv.setAsync(options);
        });

        if (callback) {
            Promise.all(promisedSet).then((data) => callback(null, data));
        }
    }
    function del(keyOptions, callback) {

    }

    var cko = {
        "get": get,
        "set": set,
        "del": del
    };
    return cko;
}

module.exports = consulKvObjectForge; 