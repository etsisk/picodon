# picodon

A lightweight, domain-agnostic string parsing library.

## Usage
```javascript
import { parse, resolver } from 'picodon';

const config = {
  rules: new Map([
    ['<', (a, b) => parseInt(a) < parseInt(b)],
  ]),
};

const parser = parse(config, resolver);

parser('3 < 0'); // false
parser('1 < 4'); // true
```
<!---
## Installation

```sh
% npm install picodon --save
```
-->
## Documentation

The _picodon_ library exposes a `parse` and `resolver` function. The `parse` function accepts two arguments: a config object and optionally, a resolver function, and returns a configured parser that can be invoked with string values.

At a high level, a configured parser has the following flow:

`Modification phase` --> `Parsing phase` --> `Resolver phase`

Let's dig in to get a better understanding of each step in this flow.

### Config

The config object is the first argument that gets passed to the `parse` function. It's responsible for the modification and parsing phases and it consists of two keys: `rules` and `modifiers`.

#### Rules `Map<string|RegExp, (...args: unknown[]) => unknown>`

Rules represent the parsing phase of the flow. They use the keys defined in its Map to tokenize the string.
When a token is found for a given rule, the corresponding function is invoked, producing a chunk ([see Resolver section for more details on chunks](#resolver)).

**Precendence is defined by the order of your key-value pairs** which may impact how your strings are parsed. The first rule has the highest precendence while the last rule has the lowest.

For example, `configA` and `configB` contain the same rules but in a different order. Using the same string, the parser produces two different results:

```javascript
import { parse, resolver } from 'picodon';

const configA = {
  rules: new Map([
    ['*', (a, b) => +a * +b],
    ['+', (a, b) => +a + +b],
  ]),
};

const configB = {
  rules: new Map([
    ['+', (a, b) => +a + +b],
    ['*', (a, b) => +a * +b],
  ]),
};

parse(configA, resolver)('2 + 5 * 3'); // 17
parse(configB, resolver)('2 + 5 * 3'); // 21
```

#### Modifiers `Map<Regexp, (match: string, str: string, cfg: Cfg) => string>`

Modifiers represent the modification phase in the flow. They provide a way to modify the string before the parsing rules are applied. You can use your own logic to modify the string or leverage the rules you've defined for the parsing phase.
While rules are well-suited for matching on a single character or a sequence of characters, modifiers are well-suited for matching on parentheses pairs, for example.
You can think of the modification phase as a way to simplify, or prepare, your string for the parsing phase. 

In the following example, let's add a modifier to identify matching parentheses. Here we're leveraging the rules we defined in our config to modify the string:

```javascript
import { parse, resolver } from 'picodon';

// RegExp matching innermost parenthesis pair
const matchingParens = /\(([^(^)])+\)/;

const config = {
  modifiers: new Map([
    [matchingParens, (match, str, cfg) => {
      // Remove surrounding parens from match
      const unwrappedStr = match.slice(1, -1);
      // Parse substring
      const result = parse(cfg, resolver)(unwrappedStr);
      // Update original string with parsed substring
      return str.replace(match, result);
    }],
  ]),
  rules: new Map([
    ['*', (a, b) => +a * +b],
    ['+', (a, b) => +a + +b],
  ]),
};

const parser = parse(config, resolver);
parser('(2 + 5) * 3'); // 21
```
Let's walk through how we got this result.

1. The modification phase is initiated
2. The modifier finds the match `'(2 + 5)'`
3. The corresponding modifier function is invoked with the matching string, the string to be parsed, and the config
4. The function strips off the parens and invokes the parser with `'2 + 5'`
5. The modification phase is initiated but no matches are found
6. The parsing phase is initiated and the rule with the key `'+'` is found
7. The corresponding function is invoked, producing the following output `[{ result: 7, ... }]`
8. The resolver function simplifies the output and returns `7` to `result`
9. The string is modified from `'(2 + 5) * 3'` to `'7 * 3'`
10. The parsing phase is initiated
11. The rule with the key `'*'` is found
12. The corresponding function is invoked, creating a chunk object with a `result` property value of `21`
13. The resolver function simplifies the output, returns `21`

### Resolver `(chunks: Chunk[]) => unknown`

The resolver function is the second argument that gets passed to `parse` and it's responsible for the resolver phase. It's an optional argument that serves to conveniently summarize the parsed results.

#### What is a chunk?

It's either a string or a plain object that has a `result` property. The value assigned to the `result` property comes from the matching rules function that was invoked during the parsing phase.

If no resolver is provided, the resulting parser function will simply return the array of chunks.

The following example illustrates what gets returned by the parser when no resolver is provided:

```javascript
import { parse } from 'picodon';

const config = {
  rules: new Map([
    ['*', (a, b) => +a * +b],
    ['+', (a, b) => +a + +b],
  ]),
};

const parser = parse(config);

parser('2 + 5 * 3'); // [{ result: 17, ... }]
```

#### Custom resolvers

The resolver function that comes with picodon is very basic and may not cover all of your needs. Check out the test file which contains a couple custom resolvers that you can use or reference when writing your own resolvers.
