function svelteCssShortNamePreprocess(source) {
  const IdGenerator = require('./idGenerator');
  const idGenerator = new IdGenerator();

  const classes = [];
  const ids = [];
  const cssClassesMap = {};
  const space = ' ';

  const classIdRegExp = /(?<=(\s(class|id)="))(([a-zA-Z0-9-_\s])*)(?=")/gim;
  const result = [...source.matchAll(classIdRegExp)];

  for (const item of result) {
    const name = item[0];
    const type = item[2];

    if (type === 'id') {
      ids.push(name);
    } else if (type === 'class') {
      if (name.includes(space)) {
        const split = name.split(space);
        split.forEach(i => classes.push(i));
      } else {
        classes.push(name);
      }
    }
  }

  classes.forEach(c => {
    cssClassesMap[c] = idGenerator();
    const regexp = new RegExp(`((?<=(\\s(class|id)="(.*)))${c}(?=(.*)"))|((?<=\\.)${c})`, 'g');
    source = source.replace(regexp, cssClassesMap[c])
  })

  return source;
}

function SvelteCssShortNamePreprocessor() {
  return {
    markup: ({ content, filename }) => {
      return {
        code: svelteCssShortNamePreprocess(content)
      };
    },
  };
}

module.exports = SvelteCssShortNamePreprocessor;