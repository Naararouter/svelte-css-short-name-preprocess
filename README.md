# svelte-css-short-name-preprocess

## Caveats
1. This is NOT production-ready package YET, since it wasn't tested enough and it doesn't have some important functionalities.
2. This doesn't affect result svelte-prefixed class-names;
3. **It shouldn't work with some kind of dynamic class-names**;

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
    cssShortNamePreprocess({ srcPath: 'src' }), // read API section below to configure
  ],
};
```

## API

### constructor options
| Option  | Required | Type   | Default | Description                                            |
|---------|----------|--------|---------|--------------------------------------------------------|
| srcPath | false    | string | 'src'   | Path to *.svelte sources relative to the project root. |

## Examples

### Simple

if you have some *.svelte file like the next one:
```sveltehtml
<script lang="typescript">
</script>

<div class="App">
</div>

<style>
    .App {
      background-color: gray;
    }
</style>
```

you will get the next result in a browser: 

<img src="https://user-images.githubusercontent.com/20820069/121783320-92a97e80-cbb6-11eb-96ff-dfa5cfed0209.jpg" width="350" height="300">

### TailwindCSS

`App.svele`:
```sveltehtml
<script lang="typescript">
  import TailwindWidget from './Tailwind/TailwindWidget.svelte';
</script>

<div class="App">
  <TailwindWidget />
</div>

<style>
    .App {
      background-color: gray;
    }
</style>
```

`./Tailwind/TailwindWidget.svelte`:
```sveltehtml
<script lang="typescript">
  import './TailwindStyles.svelte';
</script>

<div class="rounded-full py-3 px-6 bg-green-500">
  Tailwind Button
</div>
<div class="rounded-full py-3 px-6 bg-green-500">
  Tailwind Button
</div>

<style></style>
```

`./Tailwind/TailwindStyles.svelte`:
```sveltehtml
<style global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
</style>
```

**result:**

<img src="https://user-images.githubusercontent.com/20820069/121818344-4ed67800-cc8f-11eb-9922-d2cf099dd0f5.jpg" width="1000" height="600">

## TODO
- [ ] Migrate to TypeScript;
- [ ] Support dynamic svelte class-names;
- [X] Provide a way to affect css-framework class-names;
- [ ] Tests;

## Support

If you like this package, you can support me via Patreon: https://www.patreon.com/naararouter