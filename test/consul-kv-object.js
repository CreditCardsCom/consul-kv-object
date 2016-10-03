"use strict";

const sinon = require('sinon');
const should = require('should');
const fs = require('fs');
require('should-sinon');    // auguments sinon

const consulKvObject = require('../lib/consul-kv-object');

function mockConsulForge() {
    function unWrap(what, cb) {
        return cb(JSON.parse(what));
    }
    var mock = {
        "get": sinon.spy(function (options, callback) {
            var file = 'test/mock-responses/' + options.key.replace(/\/$/, '').replace(/\//g, "--") + ".json";

            if (options.key.match(/nonexisting/)) {
                callback(null, undefined);
            }

            fs.readFile(file, function (err, res) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, JSON.parse(res.toString()));
                }
            });
        }),
        "set": sinon.spy(function (options, callback) {
            setImmediate(callback, null);
        }),
        "del": sinon.spy(function (options, callback) {
            setImmediate(callback, null);
        })
    };

    return mock;
}

describe("consul-kv-object", function () {
    it("requires consul.kv as argument", function () {
        consulKvObject.should.throw();
    });
    it("returns object with get,set,del methods", function () {
        var kv = mockConsulForge();
        var objectKv = consulKvObject(kv);
        objectKv.should.be.a.Object();
        objectKv.get.should.be.a.Function();
        objectKv.set.should.be.a.Function();
        objectKv.del.should.be.a.Function();
    });
    describe("kv(consul.kv)#default", function () {
        var testKey = "test/consul-kv-object";
        var objectKv, kv;
        beforeEach(function () {
            kv = mockConsulForge();
            objectKv = consulKvObject(kv);
        });
        describe("get(options,callback)", function () {
            it("changes string 'options' to object with addedd recursion and passess it to kv.get", function () {
                objectKv.get(testKey, () => { });
                kv.get.should.be.calledWith({
                    key: testKey,
                    recurse: true
                });
            });
            it("passess options object to kv.get(), adding recurstion", function () {
                objectKv.get({
                    key: testKey,
                    foo: 123,
                    bar: 234
                }, () => { });
                kv.get.should.be.calledWith({
                    key: testKey,
                    foo: 123,
                    bar: 234,
                    recurse: true
                });
            });
            it("calls callback when done", function (done) {
                objectKv.get(testKey, (err, res) => { done(); });
            });
            it("calls callback with object representation of keystore", function (done) {
                objectKv.get(testKey, function (err, res) {
                    should.not.exist(err);
                    res.should.be.deepEqual({
                        k1: 123,
                        k2: 'v2',
                        k3: 'v3',
                        so1: {
                            k1: "v1",
                            k2: "v2"
                        },
                        so2: {
                            k1: "v1",
                            k2: "v2",
                            so21: {
                                k1: "v1"
                            }
                        }
                    });
                    done();
                });
            });
            it("allows to query for subobject", function (done) {
                objectKv.get(testKey + "/so1", function (err, res) {
                    should.not.exist(err);
                    res.should.be.deepEqual({
                        k1: "v1",
                        k2: "v2"
                    });
                    done();
                });
            });
            it("ignores trailing slash for key", function (done) {
                objectKv.get(testKey + "/so1/", function (err, res) {
                    should.not.exist(err);
                    res.should.be.deepEqual({
                        k1: "v1",
                        k2: "v2"
                    });
                    done();
                });
            });
            it("allows to query for value", function (done) {
                objectKv.get(testKey + "/k1", function (err, res) {
                    should.not.exist(err);
                    res.should.be.equal(123);
                    done();
                });
            });
            it("maps numbers", function (done) {
                objectKv.get('test/consul-kv-number', function (err, res) {
                    should.not.exist(err);
                    res.should.be.equal(123456);
                    res.should.be.a.Number();
                    done();
                });
            });
            it("maps booleans", function (done) {
                objectKv.get('test/consul-kv-boolean', function (err, res) {
                    should.not.exist(err);
                    res.should.be.a.Boolean();
                    done();
                });
            });
            it("maps dates", function (done) {
                objectKv.get('test/consul-kv-date', function (err, res) {
                    should.not.exist(err);
                    res.should.be.a.Date();
                    done();
                });
            });
            it("defaults to string if flag is not known", function (done) {
                objectKv.get('test/consul-kv-unknown', function (err, res) {
                    should.not.exist(err);
                    res.should.be.a.String();
                    res.should.be.equal("true");
                    done();
                });
            });
            it("allows to disable type mapping", function (done) {
                var objectKv = consulKvObject(kv, { mapTypes: false });
                objectKv.get('test/consul-kv-date', function (err, res) {
                    should.not.exist(err);
                    res.should.be.a.String();
                    done();
                });
            });
            it("passess error to callback", function (done) {
                objectKv.get('test/key-that-does-not-exist', function (err, res) {
                    should.exist(err);
                    done();
                });
            });
            it("returns undefined when asking for undefined key", function (done) {
                objectKv.get('test/nonexisting', function (err, res) {
                    should.not.exists(err);
                    should.equal(res, undefined);
                    done();
                });
            });
            describe("#guessTypes", function () {
                beforeEach(function () {
                    kv = mockConsulForge();
                    objectKv = consulKvObject(kv, { guessTypes: true });
                });
                it("maps numbers", function (done) {
                    objectKv.get('test/consul-kv-number-guess', function (err, res) {
                        should.not.exist(err);
                        res.should.be.equal(123456);
                        res.should.be.a.Number();
                        done();
                    });
                });
                it("maps booleans", function (done) {
                    objectKv.get('test/consul-kv-boolean-guess', function (err, res) {
                        should.not.exist(err);
                        res.should.be.a.Boolean();
                        done();
                    });
                });
                it("maps dates", function (done) {
                    objectKv.get('test/consul-kv-date-guess', function (err, res) {
                        should.not.exist(err);
                        res.should.be.a.Date();
                        done();
                    });
                });
                it("should work if there is empty object in consul", function (done) {
                    objectKv.get('test/consul-kv-null', function (err, res) {
                        should.not.exist(err);
                        should.equal(res, null);
                        done();
                    });
                });

            });
        });
        describe("set(options,callback)", function () {
            var testKey = 'test/consul-kv-set-test';
            it("sets speficied key to specified string value in default mapping", function (done) {
                objectKv.set(testKey + "/string", "value", function (err, res) {
                    should.not.exist(err);
                    kv.set.should.be.calledOnce();
                    kv.set.should.be.calledWith({
                        key: "test/consul-kv-set-test/string",
                        value: "value",
                        flags: 0
                    });
                    done();
                });
            });
            it("sets speficied key to specified number value in default mapping", function (done) {
                objectKv.set(testKey + "/number", 123, function (err, res) {
                    should.not.exist(err);
                    kv.set.should.be.calledOnce();
                    kv.set.should.be.calledWith({
                        key: "test/consul-kv-set-test/number",
                        value: "123",
                        flags: 1
                    });
                    done();
                });
            });
            it("sets speficied key to specified boolean value in default mapping", function (done) {
                objectKv.set(testKey + "/boolean", true, function (err, res) {
                    should.not.exist(err);
                    kv.set.should.be.calledOnce();
                    kv.set.should.be.calledWith({
                        key: "test/consul-kv-set-test/boolean",
                        value: "true",
                        flags: 2
                    });
                    done();
                });
            });
            it("sets speficied key to specified date value in default mapping", function (done) {
                var date = new Date('Thu Mar 10 2016 13:12:59 GMT+0100 (CET)');
                objectKv.set(testKey + "/date", date, function (err, res) {
                    should.not.exist(err);
                    kv.set.should.be.calledOnce();
                    kv.set.should.be.calledWith({
                        key: "test/consul-kv-set-test/date",
                        value: date.toString(),
                        flags: 3
                    });
                    done();
                });
            });
            it("sets a nested object", function (done) {
                var test = {
                    so1: {
                        "k11": "v11",
                        "k12": "v12",
                        so11: {
                            "k111": "v111"
                        }
                    },
                    k1: "v1",
                    k2: "v2"
                };
                objectKv.set(testKey + "/object", test, function (err, res) {
                    should.not.exist(err);
                    kv.set.should.have.callCount(5);
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/so1/k11', flags: 0, value: "v11" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/so1/k12', flags: 0, value: "v12" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/so1/so11/k111', flags: 0, value: "v111" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/k1', flags: 0, value: "v1" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/k2', flags: 0, value: "v2" });
                    done();
                });
            });
            it("sets a nested object with correct flagMapping", function (done) {
                var test = {
                    so1: {
                        "k11": "v11",
                        "k12": 123,
                        so11: {
                            "k111": false
                        }
                    },
                    k1: "v1",
                    k2: new Date('Thu Mar 10 2016 13:12:59 GMT+0100 (CET)')
                };
                objectKv.set(testKey + "/object", test, function (err, res) {
                    should.not.exist(err);
                    kv.set.should.have.callCount(5);
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/so1/k11', flags: 0, value: "v11" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/so1/k12', flags: 1, value: "123" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/so1/so11/k111', flags: 2, value: "false" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/k1', flags: 0, value: "v1" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/k2', flags: 3, value: new Date('Thu Mar 10 2016 13:12:59 GMT+0100 (CET)').toString() });
                    done();
                });
            });
            it("sets a nested object and ingnores flagmapping when flagmapper is disabled", function (done) {
                var test = {
                    so1: {
                        "k11": "v11",
                        "k12": 123,
                        so11: {
                            "k111": false
                        }
                    },
                    k1: "v1",
                    k2: new Date('Thu Mar 10 2016 13:12:59 GMT+0100 (CET)')
                };
                var objectKv = consulKvObject(kv, { mapTypes: false });

                objectKv.set(testKey + "/object", test, function (err, res) {
                    should.not.exist(err);
                    kv.set.should.have.callCount(5);
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/so1/k11', flags: 0, value: "v11" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/so1/k12', flags: 0, value: "123" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/so1/so11/k111', flags: 0, value: "false" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/k1', flags: 0, value: "v1" });
                    kv.set.should.be.calledWith({ key: 'test/consul-kv-set-test/object/k2', flags: 0, value: new Date("Thu Mar 10 2016 13:12:59 GMT+0100 (CET)").toString() });
                    done();
                });
            });
            it("sets at root of keyspace without leading slashes", function (done) {
                var test = {
                    so1: {
                        "k11": "v11",
                        "k12": 123,
                        so11: {
                            "k111": false
                        }
                    },
                    k1: "v1",
                    k2: new Date('Thu Mar 10 2016 13:12:59 GMT+0100 (CET)')
                };
                objectKv.set("", test, function (err, res) {
                    should.not.exist(err);
                    kv.set.should.have.callCount(5);
                    kv.set.should.be.calledWith({ key: 'so1/k11', flags: 0, value: "v11" });
                    kv.set.should.be.calledWith({ key: 'so1/k12', flags: 1, value: "123" });
                    kv.set.should.be.calledWith({ key: 'so1/so11/k111', flags: 2, value: "false" });
                    kv.set.should.be.calledWith({ key: 'k1', flags: 0, value: "v1" });
                    kv.set.should.be.calledWith({ key: 'k2', flags: 3, value: new Date("Thu Mar 10 2016 13:12:59 GMT+0100 (CET)").toString() });
                    done();
                });
            });
            it("sets a null object", function (done) {
                var test = {
                    null: null
                };
                objectKv.set("", test, function (err, res) {
                    should.not.exist(err);
                    kv.set.should.have.callCount(1);
                    kv.set.should.be.calledWith({ key: 'null', flags: 0, value: null });
                    done();
                });
            });
            it("works without callback", function () {
                objectKv.set("test", 123);
            });
            [1000,1e4, 1e5, 1e6].forEach(function(test_size) {

                it("allows to set large objects ("+test_size+")", function () {
                    var test = {};
                    for( var i=0; i<test_size; i++ ) {
                        test['key:'+i] = i;
                    }
                    this.timeout(test_size);
                    objectKv.set("", test, function(err, res) {
                        should.not.exist(err);
                        kv.set.should.have.callCount(test_size);
                    });
                });
            });
        });
        describe("del(options,callback)", function () {
            it("deletes object", function (done) {
                objectKv.del(testKey + "/del", function (err, res) {
                    should.not.exist(err);
                    kv.del.should.be.calledOnce();
                    kv.del.should.be.calledWith({
                        key: testKey + "/del",
                        recurse: true
                    });
                    done();
                });
            });
            it("works without callback", function () {
                objectKv.del(testKey + "/del");
            });

        });
    });

});
