const RIGHT_MERGINE = {
  normal: 3,
  big: 5,
  one: 7
};
const CHAR_MERGINE = {
  f: { normal: 3, big: 4, one: 5 }
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
    const lastChar = innerText[innerText.length - 1];
    const charMargine = CHAR_MERGINE[lastChar] ? CHAR_MERGINE[lastChar][sizeName] : 0;
    words[i] = {
      text: word.innerText,
      left: word.offsetLeft + inner.offsetLeft,
      width: inner.offsetWidth + RIGHT_MERGINE[sizeName] + charMargine
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


