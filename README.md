# consul-kv-object
[![Build Status](https://travis-ci.org/lekoder/consul-kv-object.svg?branch=master)](https://travis-ci.org/lekoder/consul-kv-object)
[![Coverage Status](https://coveralls.io/repos/github/lekoder/consul-kv-object/badge.svg?branch=master)](https://coveralls.io/github/lekoder/consul-kv-object?branch=master)

Store and retrive POJsO from consul keystore.

[![NPM](https://nodei.co/npm/consul-kv-object.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/consul-kv-object/)

## Usage

```
npm install --save consul-kv-object
```

```
var consul = require('consul')();
var kv = require('consul-kv-object')(consul.kv);

kv.set("test/key",{ pojo: true, nested: { yep: "asd" } });
kv.get("test/key", function( err, res ) { } );
kv.del("test/key");
```

## Options

Options are passed as optional second parameter.

| Option       | Default   | Meaning |
|--------------|-----------|---------|
| mapTypes     | true      | Perform type mapping when setting and getting
| guessTypes   | false     | Try to guess types when reading value with flags==0
| defaultType  | see below | Default type to use when flag is not recognized 
| typeMapFlags | see below | Type mapping array
| concurrency  | 10        | Number of concurrent consul connections when setting values

## Type mapping 

Types are preserved using flags and flag mapping array. Each type has other flag value.
When flag is not recognized or type mapping is disabled, `consul-kv-object` returns 
strings.

## Type guessing

When using `guessTypes: true` consul-kv-object will try to convert consul keys to
Numbers, Booleans and Dates based on built-in heuristic. Type guessing requires enabled
type mapping. Types determined by flags have priority.

Aim of type guessing is to allow operator to manually instert value into consul
keystore.

### Default

By default `consul-kv-object` understands and maps following types:

* String
* Number
* Boolean
* Date

### Custom

Other types can be mapped to be understood by `consul-kv-object`. To use custom types,
pass a flag mapping array as `typeMapFlags` option. It should consits of:

```js
[
    { match: Function, make: Function, guess: Function }, // flags: 0
    { match: Function, make: Function, guess: Function }, // flags: 1
    { match: Function, make: Function, guess: Function },    
    [...]   
]
``` 
* `match` is the *constructor function* of your object, the one which is in `instance.constructor`.
* `make` is a factory function which takes a string and returns instance of your object.
* `guess` is a filter function, that takes a string and returns `true` if it is valid string representation of this type. 

Objects used with `consul-kv-object` should have `.toString` method with enough representation
to re-construct object with `make` call.   
 
# Build and testing

Basic tests:
```bash
npm test
```

Test coverage:
```
npm run coverage
```

Acceptance tests with live consul:

```
consul agent -bootstrap -server -advertise=127.0.0.1 -data-dir=/tmp/ &
npm run acceptance
```
