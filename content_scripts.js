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

const fetchMaskData = (sizeName) => {
  document.querySelectorAll('.karaoke-background').forEach((i) => {
    i.innerHTML = i.textContent.split(' ').map((word) => word && word.replace(/([“]?)(.*?)([”\,\.\?]?)$/, '<span class="word-for-mask">$1<span class="word-for-mask-inner">$2</span>$3</span>')).join(' ')
  });
  const words = [];
  document.querySelectorAll('.word-for-mask').forEach((word, i) => {
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
  wordMask[sizeName] = words;
  console.log(sizeName, words);
}

window.createMask = (arg) => {
  Object.entries(wordMask).forEach(([sizeName, words]) => {
    let count = 0;
    arg.word[sizeName].forEach((sentence) => {
      for (let i = 0; i < sentence.length; i++) {
        const word = sentence[i];
        if (word.text != words[count].text) {
            console.log(count, word, words[count]);
        }
        word.left = words[count].left;
        word.width = words[count].width;
        count++;
      }
    });
  });
  console.log(JSON.stringify(arg, null, '  '));
}
fetchMaskData('normal');
console.log("createMask ready");


