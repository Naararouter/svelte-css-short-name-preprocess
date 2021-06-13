const path = require('path');
const fs = require('fs').promises;

const IdGenerator = require('./idGenerator');
const walk = require('./utils').walk;
const idGenerator = new IdGenerator();

const regExptToFindClassAndId = /(?<=(\s(class|id)="))(([a-zA-Z0-9-_\s])*)(?=")/gim;
const getRegExpToReplace = (c) => new RegExp(`((?<=(\\s(class|id)="(.*)))${c}(?=(.*)"))|((?<=\\.)${c})`, 'g');
const space = ' ';

class SvelteCssShortNamePreprocess {
  #init = false;
  // TODO: it's better now, but we can generate independent local short names in some cases
  #classes = {};
  #ids = {};
  #cssClassesMap = {};
  #srcPath = '';

  constructor(props = {}) {
    this.#srcPath = props.srcPath || 'src';
  }

  appendCssClassMapFromSource(source) {
    const result = [...source.matchAll(regExptToFindClassAndId)];

    for (const item of result) {
      const name = item[0];
      const type = item[2];

      if (type === 'id') {
        this.#ids[name] = true;
      } else if (type === 'class') {
        if (name.includes(space)) {
          const split = name.split(space);
          split.forEach(i => {
            this.#classes[i] = true;
          });
        } else {
          this.#classes[name] = true;
        }
      }
    }

    Object.keys(this.#classes).forEach(c => {
      // TODO: we can reduce result dictionary to avoid adding of unused classes;
      if (!this.#cssClassesMap[c]) this.#cssClassesMap[c] = idGenerator();
    })

    return source;
  }

  replaceCssClasses(content) {
    let source = content;
    Object.entries(this.#cssClassesMap).forEach(([key, value]) => {
      source = source.replace(getRegExpToReplace(key), value);
    });
    return source;
  }

  async appendCssClassMapFromDirectory() {
    if (!this.#init) {
      const filenames = await walk(path.resolve(__dirname, `../../${this.#srcPath}`))
      for (const filename of filenames) {
        if (filename.endsWith('.svelte')) {
          const content = await fs.readFile(filename);
          this.appendCssClassMapFromSource(content.toString());
        }
      }
      this.#init = true;
    }
  }
}

function SvelteCssShortNamePreprocessor(props) {
  const preprocess = new SvelteCssShortNamePreprocess(props);
  return {
    markup: async ({ content, filename }) => {
      await preprocess.appendCssClassMapFromDirectory();
      return {
        code: preprocess.replaceCssClasses(content)
      };
    },
    style: ({ content, filename }) => {
      return { code: preprocess.replaceCssClasses(content) }
    }
  };
}

module.exports = SvelteCssShortNamePreprocessor;