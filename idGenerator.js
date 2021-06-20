// Leaving 'd' out to avoid generating the word 'ad'
const defaultAlphabet = "abcefghijklmnopqrstuvwxyz0123456789";

const IdGenerator = function (alphabet) {
  const options = {
    alphabet: alphabet || defaultAlphabet,
    length: 1,
    index: 0,
  };

  return function () {
    let res = generateId(options);
    while (/^[0-9-].*$/.test(res)) res = generateId(options);
    return res;
  };
};

const generateId = function (options) {
  let res = "";

  for (let i = options.length - 1; i >= 0; i--) {
    const x = Math.pow(options.alphabet.length, i);
    const n = Math.floor(options.index / x);
    res += options.alphabet[n % options.alphabet.length];
  }

  options.index++;
  if (options.index > Math.pow(options.alphabet.length, options.length) - 1) {
    options.length++;
    options.index = 0;
  }

  return res;
};

module.exports = IdGenerator;
