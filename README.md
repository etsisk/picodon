# str-parse

A lightweight, domain-agnostic string parsing library.

## Usage
```javascript
import { parse } from 'str-parse';

const config = new Map([
  ['<', (a, b) => parseInt(a) < parseInt(b)],
]);

const parser = parse(config, resolver);

const testA = parser('3 < 0');
console.log(testA); // false

const testB = parser('1 < 4');
console.log(testB); // true

function resolver(results) {
  if (results.length === 1 && Object.hasOwn(results[0], 'result')) {
    return results[0].result;
  }
  return results;
}
```


## Installation

```sh
% npm install str-parse --save
```

## Documentation

### Tokens

### Modifiers

### Resolvers
