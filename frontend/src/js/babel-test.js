// The purpose of this file is to test how Babel translates newer JS features
// for older browsers.

import './common';

const values = ['alpha', 'beta', 'gamma'];

const valuesMap = new Map(values.map((x, i) => [x, i]));

for(const value of values) {
  console.log(value);
  console.log(valuesMap.get(value));
}
