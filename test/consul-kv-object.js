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
            var file = 'test/mock-responses/' + options.key.replace(/\//g, "--") + ".json";

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
                objectKv.get(testKey, (err, res) => { done(); })
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
                    })
                    done();
                });
            });
            it("allows to query for subobject", function (done) {
                objectKv.get(testKey + "/so1", function (err, res) {
                    should.not.exist(err);
                    res.should.be.deepEqual({
                        k1: "v1",
                        k2: "v2"
                    })
                    done();
                });
            });
            it("allows to query for value", function(done) {
                objectKv.get(testKey + "/k1", function (err, res) {
                    should.not.exist(err);
                    res.should.be.equal(123);
                    done();
                });
            });
            it("maps numbers", function(done) {
                objectKv.get('test/consul-kv-number', function(err,res) {
                    should.not.exist(err);
                    res.should.be.equal(123456);
                    res.should.be.a.Number();
                    done();
                })
            });
            it("maps booleans", function(done) {
                objectKv.get('test/consul-kv-boolean', function(err,res) {
                    should.not.exist(err);
                    res.should.be.a.Boolean();
                    done();
                })
            });
            it("maps dates", function(done) {
                objectKv.get('test/consul-kv-date', function(err,res) {
                    should.not.exist(err);
                    res.should.be.a.Date();
                    done();
                })
            });
        });
        describe("set(options,callback)", function () {

        });
        describe("del(options,callback)", function () {

        });
    })

});
