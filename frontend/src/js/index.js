import './common';

import * as treeshaking from './treeshaking';

function wait(duration, message) {
  return new Promise((resolve) => {
    setTimeout(() => { resolve(message); }, duration);
  });
}

async function myFunc() {
  const message = await wait(1000, 'hello');
  return `${message} world`;
}

console.log('waiting...');
myFunc(1000, 'hello world').then((message) => {
  console.log(message);
  console.log(treeshaking.keepMe(1));
  console.log(treeshaking.keepMe(2));
  console.log(treeshaking.keepMe(3));
  console.log(treeshaking.keepMe(4));
  console.log(treeshaking.keepMe(5));
});
