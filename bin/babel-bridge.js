#!/usr/bin/env node
// ES6/ES7 transpiler
console.log('Transpiling ES6/7 to ES5, please wait...');
require('babel/register');

require('./cli.js');