const path = require('path');
const fs = require('fs').promises;

const IdGenerator = require('./idGenerator');
const walk = require('./utils').walk;
const idGenerator = new IdGenerator();

const getRegExpToReplace = (c) => new RegExp(`((?<=(\\s(class|id)(="|:)(.*)))\\b${c}\\b(?=([^?]*)"))|((?<=\\.)\\b${c}\\b)`, 'g');
const space = ' ';

const classIdLB = '?<=(\\s(class|id)="';
const classLetters = '[a-zA-Z0-9-_\\s]*';

const regExps = {
  staticIdAndClassNames: `((${classIdLB}))(${classLetters})(?="))`,
  svelteDynamic: {
    simpleClassNames: '((?<=(\\sclass:))(\\b[a-zA-Z]*\\b))',
    ternary: {
      true: `((${classIdLB}.*{.*\\?\\s*[\'"]))(${classLetters}))`,
      false: `((${classIdLB}.*{.*\\?\\s*[\'"]${classLetters}[\'"]\\s*:\\s*["\']))${classLetters})`,
      staticPrefix: `((${classIdLB}))(${classLetters})(?=(\\s*{)))`,
      staticPostfix: `((${classIdLB}${classLetters}{.*\\?\\s*[\'"]${classLetters}[\'"]\\s*:\\s*["\']${classLetters}[\'"]\\s*}\\s*))(${classLetters}))`
    }
  }
};

const regExptToFindClassAndId = new RegExp(`${regExps.staticIdAndClassNames}|${regExps.svelteDynamic.simpleClassNames}|${regExps.svelteDynamic.ternary.true}|${regExps.svelteDynamic.ternary.false}|${regExps.svelteDynamic.ternary.staticPrefix}|${regExps.svelteDynamic.ternary.staticPostfix}`, 'gm')

class SvelteCssShortNamePreprocess {
  #init = false;
  // TODO: it's better now, but we can generate independent local short names in some cases
  #classes = {};
  #ids = {};
  #cssClassesMap = {};
  #jsBindClassesMap = {};
  #jsBindVars = {};
  #srcPath = '';
  #jsBindEnabled = false;

  constructor(props = {}) {
    this.#srcPath = props.srcPath || 'src';
    this.#jsBindEnabled = props.jsBindEnabled || false;
  }

  getCssClassesMap() {
    return this.#cssClassesMap;
  }

  getJsBindClassesMap() {
    return this.#jsBindClassesMap;
  }

  appendCssClassMapFromSource(source) {
    const regExpResult = [...source.matchAll(regExptToFindClassAndId)];
    const result = regExpResult.map(i => i.filter(j => j));

    for (const item of result) {
      const name = item[0].trim();
      let type = item[2];

      if (!name) continue;
      if (!type) continue;
      type = type.trim();

      if (type.startsWith('id')) {
        this.#ids[name] = true;
      } else if (type.startsWith('class:')) {
        if (this.#jsBindEnabled) {
          this.#jsBindVars[name] = true;
        }
      } else if (type.startsWith('class')) {
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

    Object.keys(this.#jsBindVars).forEach(c => {
      if (!this.#jsBindClassesMap[c]) this.#jsBindClassesMap[c] = idGenerator();
    })

    return source;
  }

  #searchByTernary(source, i, callback) {
    const questionIdx = source.indexOf('?', i);
    const doubleDotIdx = source.indexOf(':', i);
    if (~questionIdx && ~doubleDotIdx && questionIdx < doubleDotIdx) {
      callback(questionIdx, doubleDotIdx);
    }
  }

  findAndReplaceClassInMarkup(content, key, value) {
    const classRegExp = /(class|id)="/gm;
    let source = content;
    let startIndexes = [...source.matchAll(classRegExp)].map(i => i.index + i[0].length);
    let lastEnd = 0;
    let result = [];
    let isTernaryOpen = false;
    startIndexes.forEach(idx => {
      let matched = '';
      let startMatch = -1;

      for (let i = idx; i < source.length; i++) {
        const char = source[i];

        if (char === '"') {
          break;
        }

        if (char === '{') {
          isTernaryOpen = true;
          this.#searchByTernary(source, i, (questionIdx) => {
            i = questionIdx;
          })
        }
        if (isTernaryOpen && char === ':') {
          this.#searchByTernary(source, i + 1, (questionIdx) => {
            i = questionIdx;
          })
        }
        if (isTernaryOpen && char === '}') isTernaryOpen = false;

        if (key[matched.length] === char) {
          if (matched.length === 0 && [' ', '"', '\''].includes(source[i - 1])) {
            startMatch = i;
          }
          matched += char;

          if (matched === key && [' ', '"', '\''].includes(source[i + 1])) {
            result.push(
              source.substring(lastEnd, startMatch)
            )
            lastEnd = startMatch + key.length;
          }
        } else {
          matched = '';
          startMatch = -1;
        }
      }
    });

    result.push(source.substring(lastEnd));
    return result.join(value);
  }

  findTagAndReplaceContent(tag, content, callback) {
    let source = content;
    const tagRegExp = new RegExp(`(<${tag}(.*)>)|(<\\/${tag}>)`, 'gm')
    const tagsRegExpInfo = [...source.matchAll(tagRegExp)];

    if (tagsRegExpInfo.length === 0) return { slice: '', subSource: content };

    const openIndex = tagsRegExpInfo[0].index;
    const closeIndex = tagsRegExpInfo[1].index;
    const openTag = tagsRegExpInfo[0][0];
    const closeTag = tagsRegExpInfo[1][0];

    const originTagContentSlice = source.slice(openIndex + openTag.length, closeIndex).trim();
    const resultTagContentSlice = callback(originTagContentSlice);

    return {
      slice: [openTag, resultTagContentSlice, closeTag].join(''),
      subSource: content.substring(0, openIndex) + content.substr(closeIndex + closeTag.length)
    }
  }

  replaceStyleCssClasses(content) {
    let source = content;
    Object.entries({ ...this.#cssClassesMap, ...this.#jsBindClassesMap }).forEach(([key, value]) => {
      // TODO: fix with more simple regexp;
      source = source.replace(getRegExpToReplace(key), value);
    });
    return source;
  }

  preprocess(content) {
    const { slice: scriptSlice, subSource: scriptRemovedSource } = this.findTagAndReplaceContent('script', content, (originScript) => {
      let source = originScript;
      Object.entries(this.#jsBindClassesMap).forEach(([key, value]) => {
        const regexp = new RegExp(`(?<!(function\\s|bind:|['"].*))\\b${key}\\b`, 'gm');
        source = source.replace(regexp, this.#jsBindClassesMap[key]);
      });
      return source;
    });

    const { slice: styleSlice, subSource } = this.findTagAndReplaceContent('style', scriptRemovedSource,(originStyles) => {
      return originStyles;
    });

    let markupSlice = subSource;
    Object.entries(this.#jsBindClassesMap).forEach(([key, value]) => {
      const tRegExp = new RegExp(`(?<!(bind:|on:))\\b${key}\\b`, 'gm');

      const markupMatches = [...markupSlice.matchAll(tRegExp)];
      let diff = 0;
      const validMatches = markupMatches.filter(({index}) => {
        let openBraceCount = 0;
        let closeBraceCount = 0;
        for (let i = index; i < markupSlice.length; i++) {
          const char = markupSlice[i];
          if (char === '}') closeBraceCount++;
          if (char === '{') openBraceCount++;
          if (char === '>' || (char === '<' && closeBraceCount > openBraceCount)) return true;
          if (char === '<') return false;
        }
      }).map(({index}) => index);

      validMatches.forEach(index => {
        const idxDiff = index - diff;
        markupSlice = markupSlice.slice(0, idxDiff) + value + markupSlice.slice(idxDiff + key.length);
        diff += key.length - value.length;
      });
    });

    Object.entries(this.#cssClassesMap).forEach(([key, value]) => {
      markupSlice = this.findAndReplaceClassInMarkup(markupSlice, key, value);
    })

    return [scriptSlice, markupSlice, styleSlice].join('');
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
      let source = preprocess.preprocess(content);
      return {
        code: source
      };
    },
    style: ({ content, filename }) => {
      return { code: preprocess.replaceStyleCssClasses(content) }
    }
  };
}

module.exports = SvelteCssShortNamePreprocessor;