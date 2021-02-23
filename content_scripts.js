const LEFT_MARGIN = {
  normal: 0,
  big: 0,
  one: -2
};
const RIGHT_MARGIN = {
  normal: 3,
  big: 5,
  one: 9
};
const CHAR_LEFT_MARGIN = {
  j: { normal: -5, big: -7, one: -12 },
  p: { normal: -1, big: -1, one: -2 },
  u: { normal: -1, big: -1, one: -2 }
};
const CHAR_RIGHT_MARGIN = {
  f: { normal: 4, big: 4, one: 8 },
  p: { normal: 0, big: 0, one: 3 },
  r: { normal: 2, big: 0, one: 3 },
  y: { normal: 2, big: 0, one: 2 }
};
const wordMask = {};
new MutationObserver(records => {
  const classList = records[0].target.classList;
  let sizeName = 'normal';
  classList.contains('big') && (sizeName = 'big');
  classList.contains('one') && (sizeName = 'one');
  fetchMaskData(sizeName);
}).observe(document.querySelector('.unit-scroll-content'), {
  attributes: true
});

const fetchRowMaskData = (parent, sizeName) => {
  const words = [];
  parent.querySelectorAll('.word-for-mask').forEach((word, i) => {
    const inner = word.querySelector('.word-for-mask-inner');
    const innerText = inner.innerText;
    const firstChar = innerText[0];
    const lastChar = innerText[innerText.length - 1];
    const charLeftMargin = CHAR_LEFT_MARGIN[firstChar] ? CHAR_LEFT_MARGIN[firstChar][sizeName] : 0;
    const charRightMargin = CHAR_RIGHT_MARGIN[lastChar] ? CHAR_RIGHT_MARGIN[lastChar][sizeName] : 0;
    const isDot = word.innerText === '.';
    let targetElement = word;
    let offsetLeft = 0;
    while (!Object.values(targetElement.classList).includes('karaoke-block')) {
      offsetLeft += targetElement.offsetLeft;
      targetElement = targetElement.offsetParent;
    }
    words[i] = {
      text: word.innerText,
      left: offsetLeft + inner.offsetLeft + LEFT_MARGIN[sizeName] + charLeftMargin,
      width: isDot ? 0 : (inner.offsetWidth + RIGHT_MARGIN[sizeName] + charRightMargin - charLeftMargin) // 左にずらした分幅が足りなくなるので - charLeftMargin して足してあげる
    };
  });

  return words;
}

const fetchMaskData = (sizeName) => {
  return new Promise((resolve) => setTimeout(resolve, 100)).then(() => {
    const rowList = [];
    if (document.querySelectorAll('.word-for-mask').length > 0) {
      return;
    };
    document.querySelectorAll('.karaoke-background').forEach((i) => {
      const replaceList = i.textContent
      .split(' ')
      .map((word) => {
        let targetWord = word;
        if (!targetWord) {
          return {key: '', value: ''};
        }
        targetWord = word !== '.' ? word.match(/^(.*?)(\.$|$)/)[1] : word;
        // - や ' があれば分割する
        return {
          key: targetWord,
          value: targetWord.match(/[^-']*['-]?/g).filter((text) => text).reduce((ret, word) => {
            return ret.concat(word.replace(/([“]?)(.*?)([”\,\.\?\!]*?)$/, '<span class="word-for-mask" style="font: inherit;">$1<span class="word-for-mask-inner" style="font: inherit; background-color: #00ffff;">$2</span>$3</span>'));
          }, '')
        };
      });

      let lastReplacer = replaceList.shift();
      i.innerHTML = i.innerHTML
      .split(' ')
      .map((word) => {
        if (!lastReplacer) {
          return word;
        }
        const replaceKey = new RegExp(`(^|(\\W))${lastReplacer.key.replace('?', '\\?').replace('.', '\\.')}((\\W)|$)`);
        if (!word.match(replaceKey)) {
          return word;
        }
        const ret = word.replace(replaceKey, `$2${lastReplacer.value}$4`);
        lastReplacer = replaceList.shift();
        return ret;
      })
      .join(' ');
      rowList.push(fetchRowMaskData(i, sizeName));
    });
    console.log(sizeName, rowList);
    wordMask[sizeName] = rowList;
  });
}

/**
 * .json ファイルを取得して mask.json のベースを作る。この時点では left と width は入っていない。
 */
const initMaskData = () => {
  const urlPath = location.href.split('/');
  if (urlPath[urlPath.length - 1] === '') {
    urlPath.pop();
  }
  const targetName = urlPath.pop();
  const targetGrade = urlPath.pop();
  urlPath.pop();
  urlPath.pop();
  return fetch(`${urlPath.join('/')}/__app/config/${targetGrade}/unit_config/${targetName}.json`).then((res) => res.json()).then((json) => {
    const baseMaskJson = Object.entries(json).reduce((baseMaskJson, [key, words]) => {
      console.log(`---------- ${key} ---------`);
      // TODO TA TF 系も考慮が必要？
      if (!['words'].includes(key) && (key.indexOf('wordsscript') !== 0 || key.match(/^wordsscript.*?(_all)$/))) {
        console.log('スキップ');
        return baseMaskJson;
      }
      return baseMaskJson.concat(words.karaoke.reduce((baseWordsMaskJson, page) => {
        let lastRowText = '';
        return baseWordsMaskJson.concat(Object.entries(page).reduce((pageBaseMaskJson, [key, group]) => {
          return pageBaseMaskJson.concat(group.data.reduce((rowBaseMaskJson, row) => {
            let rowtext = row.text_original || row.text;
            if (Array.isArray(rowtext)) {
              rowtext = rowtext.join(' ');
            }
            // 同じ文章の場合はスキップ
            if (lastRowText === rowtext) {
              return rowBaseMaskJson;
            }
            lastRowText = rowtext;
            return rowBaseMaskJson.concat(rowtext.replace(/<sl>/g, ' ').replace(/<(?!\/?(verb|noun|newwords|elementary|keysentence))[^>]*>/g, '').replace(/\sclass=/g,'__').replace(/__\"/g,'__').replace(/\">/g,'>').trim().split(' ').map((word) => {
              if (!word) {
                return null;
              }
              return {
                text: word.replace(/<[^>]*>/g, ''),
                left: 0,
                width: 0,
                verb: /<verb[>_ ]/.test(word),
                noun: /<noun[>_ ]/.test(word),
                newwords: /<newwords[>_ ]/.test(word),
                elementary: /<elementary[>_ ]/.test(word),
                keysentence: /<keysentence[>_ ]/.test(word),
                class: []
                .concat(word.match(/verb__underline-[0-9]{2}/g))
                .concat(word.match(/noun__underline-[0-9]{2}/g))
                .concat(word.match(/newwords__underline-[0-9]{2}/g))
                .concat(word.match(/elementary__underline-[0-9]{2}/g))
                .concat(word.match(/keysentence__underline-[0-9]{2}/g))
                .filter((item) => item)
              };
            })).filter((item => item)).reduce((rowItems, item) => {
              // - や ' があれば分割する
              return rowItems.concat(item.text.match(/[^-']*['-]?/g).filter((text) => text).map((text) => {
                return Object.assign({}, item, { text });
              }));
            }, []);
          }, []));
        }, []));
      }, []));
    }, []);
    return baseMaskJson;
  });
  
}

document.querySelector('.unit-btn-control-script')?.click();
initMaskData().then((baseMaskJsonData) => {
  console.log(baseMaskJsonData);
  document.querySelectorAll('.unit-script-content').forEach((el) => {
    el.style.display = 'block';
    el.querySelectorAll('.unit-scroll-content').forEach((el) => {
      el.style.visibility = 'visible';
    });
  });
  // ページのレンダリングがおわるまですこし待つ
  new Promise((resolve) => setTimeout(resolve, 400)).then(() => {
    window.createMask = () => {
      Object.entries(wordMask).forEach(([sizeName, words]) => {
        let count = 0;
        let retryCount = 0;
        words.forEach((sentence) => {
          for (let i = 0; i < sentence.length; i++) {
            const word = sentence[i];
            let baseData = baseMaskJsonData[count];
            while (word.text.indexOf(baseData.text) !== 0 && baseData.text.indexOf(word.text) !== 0) {
              if (retryCount++ > 2) {
                console.error(sizeName, count, word, baseData);
                throw new Error('main の json の text と、表示されているテキストが一致しない');
              };
              console.warn(sizeName, count, word, baseData, 'main の json の text と、表示されているテキストが一致しない');
              if (word.text === '.') {
                return;
              }
              if (baseData.text === '.') {
                baseData = baseMaskJsonData[++count];
                continue;
              }
              throw new Error('main の json の text と、表示されているテキストが一致しない');
            }
            retryCount = 0;
            word.verb = baseData.verb;
            word.noun = baseData.noun;
            word.newwords = baseData.newwords;
            word.elementary = baseData.elementary;
            word.keysentence = baseData.keysentence;
            word.class = baseData.class;
            count++;
          }
        });
      });
      console.log(JSON.stringify({ word: wordMask }, null, '  '));
    }
    fetchMaskData('normal');
    console.log("createMask ready");
  });
});



