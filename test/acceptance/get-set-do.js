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
        { test: "asd" }
    ].forEach(function (tv) {

        it("sets and reads a " + tv.constructor.name + ":" + tv.toLocaleString(), function (done) {
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



});