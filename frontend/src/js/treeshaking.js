export function keepMe(x) {
  return `this is a function that will be used and should be kept ${x * x}`;
}

export function pruneMe(x) {
  return `this is a function that should be eliminated by tree shaking ${x * x * x}`;
}
