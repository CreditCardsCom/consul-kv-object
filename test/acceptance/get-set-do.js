const should = require('should');
const consulForge = require('consul');
const objectKvForge = require('../../lib/consul-kv-object');
const Promise = require("bluebird");

describe("Acceptance with live consul", function () {
    var consul = consulForge();
    var objectKv = Promise.promisifyAll(objectKvForge(consul.kv));

    var testSpace = "test/consul-kv-object";

    beforeEach(function (done) {

        objectKv.del(testSpace, () => done());

    });

    [
        "asd",
        123, 0, 0xff,
        false, true,
        new Date('Thu Mar 10 2016 14:34:45 GMT+0100 (CET)'),
        { test: "asd" },
        { nested: { more: { values: 123 }}},
        { test: { nested: false }}
    ].forEach(function (tv) {

        it("sets and reads a " + tv.constructor.name + ":" + JSON.stringify(tv), function (done) {
            var tk = testSpace + "/test";
            objectKv.set(tk, tv, function (err, res) {
                should.not.exist(err);

                objectKv.get(tk, function (err, res) {
                    should.not.exist(err);
                    res.should.be.a[tv.constructor.name]();
                    res.should.be.deepEqual(tv);
                    done();
                });
            });
        });
    });
    
    it("can set object at root of consul keystore", function(done) {
        var testObj = {
            test: {
                asd:123
            }
        };
        objectKv.set("",testObj, function(err,res) {
            should.not.exist(err);
            objectKv.get("test/asd", function(err,res) {
                should.not.exist(err);
                res.should.be.equal(123);
                done();
            });
        })
        
    });

});