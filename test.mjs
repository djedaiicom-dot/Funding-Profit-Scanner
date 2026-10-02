import assert from 'node:assert/strict';
import {walkBuy,walkBase} from './common.mjs';
const x=walkBuy([["10","20"],["11","20"]],100);assert.equal(x.ok,true);assert.equal(x.base,10);assert.equal(x.vwap,10);
const y=walkBase([["10","3"],["9","8"]],10);assert.equal(y.ok,true);assert.equal(y.base,10);assert.equal(y.quote,93);
const expected=5+(10-9)*10+(9-10)*10-1;assert.equal(expected,4);
console.log('PASS core execution math');
