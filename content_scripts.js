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
    words[i] = {
      text: word.innerText,
      left: word.parentElement.offsetLeft + word.offsetLeft + inner.offsetLeft + LEFT_MARGIN[sizeName] + charLeftMargin,
      width: inner.offsetWidth + RIGHT_MARGIN[sizeName] + charRightMargin - charLeftMargin // 左にずらした分幅が足りなくなるので - charLeftMargin して足してあげる
    };
  });

  return words;
}

const fetchMaskData = (sizeName) => {
  const rowList = [];
  document.querySelectorAll('.karaoke-background').forEach((i) => {
    i.innerHTML = i.textContent
      .split(' ')
      .filter((word) => word !== '.')
      .map((word) => {
        if (!word) {
          return word;
        }
        // - や ' があれば分割する
        return word.match(/[^-']*['-]?/g).filter((text) => text).reduce((ret, word) => {
          return ret.concat(word.replace(/([“]?)(.*?)([”\,\.\?]*?)$/, '<span class="word-for-mask">$1<span class="word-for-mask-inner">$2</span>$3</span>'));
        }, '');
      })
      .join(' ');
    rowList.push(fetchRowMaskData(i, sizeName));
  });
  console.log(sizeName, rowList);
  wordMask[sizeName] = rowList;
}

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
        return baseWordsMaskJson.concat(Object.entries(page).reduce((pageBaseMaskJson, [key, group]) => {
          return pageBaseMaskJson.concat(group.data.reduce((rowBaseMaskJson, row) => {
            const rowtext = row.text_original || row.text;
            return rowBaseMaskJson.concat(rowtext.replace(/\sclass=/g,'__').replace(/__\"/g,'__').replace(/\">/g,'>').replace(/<sl>/g, ' ').trim().split(' ').map((word) => {
              if (!word) {
                return null;
              }
              return {
                text: word.replace(/<[^>]*>/g, ''),
                left: 0,
                width: 0,
                verb: /<vreb[>_ ]/.test(word),
                noun: /<noun[>_ ]/.test(word),
                newwords: /<newwords[>_ ]/.test(word),
                elementary: /<elementary[>_ ]/.test(word),
                keysentence: /<keysentence[>_ ]/.test(word),
                class: []
                .concat(word.match(/vreb__underline-[0-9]{2}/g))
                .concat(word.match(/noun__underline-[0-9]{2}/g))
                .concat(word.match(/newwords__underline-[0-9]{2}/g))
                .concat(word.match(/elementary__underline-[0-9]{2}/g))
                .concat(word.match(/keysentence__underline-[0-9]{2}/g))
                .filter((item) => item)
              };
            })).filter((item => item));
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
        words.forEach((sentence) => {
          for (let i = 0; i < sentence.length; i++) {
            const word = sentence[i];
            const baseData = baseMaskJsonData[count];
            if (word.text != baseData.text) {
                console.error(sizeName, count, word, baseData);
                throw new Error('main の json の text と、表示されているテキストが一致しない');
            }
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



