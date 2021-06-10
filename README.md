# svelte-css-short-name-preprocess

## Caveats
1. This is NOT production-ready package YET, since it wasn't tested enough and it doesn't have some important functionalities.
2. The preprocessor will transform ALL your classes in *.svelte files. That means you'll get short names even for your CSS framework classes that you, probably, don't want to short separately, without the css-framework's bundle itself.
3. This doesn't affect result svelte-prefixed class-names;

## Motivation
I didn't find any package for generating short css names for classes in svelte and I decided to make it myself. 

## Installation
1. `npm i svelte-css-short-name-preprocess --save-dev`
2. add to your `svelte.config.js`:
```javascript
const autoPreprocess = require("svelte-preprocess");
const cssShortNamePreprocess = require('svelte-css-short-name-preprocess');

module.exports = {
  preprocess: [
    autoPreprocess({
      defaults: {
        script: "typescript",
      },
    }),
    cssShortNamePreprocess(),
  ],
};
```

## TODO
- [ ] Provide a way to affect css-framework classnames;
- [ ] Make more real tests;