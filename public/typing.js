// ---------------- Typing Game Setup ----------------
const wordsCount = words?.length || 0;
window.timer = null;
window.gameStart = null;

function addClass(el, name) {
  el.className += " " + name;
}
function removeClass(el, name) {
  el.className = el.className.replace(name, "");
}

function formatWord(word) {
  return `<div class="word"><span class="letter">${word
    .split("")
    .join("</span><span class='letter'>")}</span></div>`;
}

// ✅ calculate WPM live
function getWpm() {
  const words = [...document.querySelectorAll(".word")];
  const lastTypedWord = document.querySelector(".word.current");
  const lastTypedWordIndex = words.indexOf(lastTypedWord) + 1;
  const typedWords = words.slice(0, lastTypedWordIndex);
  const correctWords = typedWords.filter((word) => {
    const letters = [...word.children];
    const incorrectLetters = letters.filter((l) =>
      l.className.includes("incorrect")
    );
    const correctLetters = letters.filter((l) =>
      l.className.includes("correct")
    );
    return incorrectLetters.length === 0 && correctLetters.length === letters.length;
  });
  const minutes = (Date.now() - window.gameStart) / 60000;
  return minutes > 0 ? Math.round(correctWords.length / minutes) : 0;
}

// ---------------- Typing Logic ----------------
document.getElementById("game").addEventListener("keyup", async (ev) => {
  const key = ev.key;
  const currentWord = document.querySelector(".word.current");
  const currentLetter = document.querySelector(".letter.current");
  const expected = currentLetter?.innerHTML || " ";
  const isLetter = key.length === 1 && key !== " ";
  const isSpace = key === " ";
  const isBackspace = key === "Backspace";
  const isFirstLetter = currentLetter === currentWord?.firstChild;

  if (document.querySelector("#game.over")) return;

  if (!window.gameStart && isLetter) {
    window.gameStart = Date.now();
    // ✅ Update WPM continuously
    window.timer = setInterval(() => {
      document.getElementById("info").innerHTML = `WPM: ${getWpm()}`;
    }, 1000);
  }


  
  if (isLetter) {
  if (currentLetter) {
  if (key === expected) {
       
  addClass(currentLetter, "correct");
  removeClass(currentLetter, "current");
  if (currentLetter.nextSibling) {
  addClass(currentLetter.nextSibling, "current");
  }
  } else {
        
  addClass(currentLetter, "incorrect");
  }
  }
  }



  if (isSpace) {
    ev.preventDefault();

  if (expected !== " ") {
  const lettersToInvalidate = [
  ...document.querySelectorAll(".word.current .letter:not(.correct)"),
  ];
  lettersToInvalidate.forEach((letter) => addClass(letter, "incorrect"));
  }

    if (currentWord.nextSibling) {
        removeClass(currentWord, "current");
        addClass(currentWord.nextSibling, "current");
        if (currentLetter) removeClass(currentLetter, "current");
        addClass(currentWord.nextSibling.firstChild, "current");
    } else {
        clearInterval(window.timer);
        addClass(document.getElementById('game'), 'over');
        document.getElementById("info").innerHTML = `WPM: ${getWpm()}`;
    }
  }


  
  

  if (isBackspace) {
    if (currentLetter && isFirstLetter) {
      removeClass(currentWord, "current");
      addClass(currentWord.previousSibling, "current");
      removeClass(currentLetter, "current");
      addClass(currentWord.previousSibling.lastChild, "current");
      removeClass(currentWord.previousSibling.lastChild, "incorrect");
      removeClass(currentWord.previousSibling.lastChild, "correct");
    }
    if (currentLetter && !isFirstLetter) {
      removeClass(currentLetter, "current");
      addClass(currentLetter.previousSibling, "current");
      removeClass(currentLetter.previousSibling, "incorrect");
      removeClass(currentLetter.previousSibling, "correct");
    }
    if (!currentLetter) {
      addClass(currentWord.lastChild, "current");
      removeClass(currentWord.lastChild, "incorrect");
      removeClass(currentWord.lastChild, "correct");
    }
  }

  // move lines
  // if (currentWord?.getBoundingClientRect().top > 250) {
  //   const words = document.getElementById("words");
  //   const margin = parseInt(words.style.marginTop || "0px");
  //   words.style.marginTop = margin - 35 + "px";
  // }

  // move cursor
  const nextLetter = document.querySelector(".letter.current");
  const nextWord = document.querySelector(".word.current");
  const cursor = document.getElementById("cursor");
  if (nextLetter || nextWord) {
    cursor.style.top =
      (nextLetter || nextWord).getBoundingClientRect().top + 2 + "px";
    cursor.style.left =
      (nextLetter || nextWord).getBoundingClientRect()[
        nextLetter ? "left" : "right"
      ] + "px";
  }


});


// ----------------- AI story stuff -----------------

async function fetchStoryParagraph(choice = null) {
  const response = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice })
  });
  const data = await response.json();
  return data.paragraph;
}






//-----------------------------------------------------------------------------------------


async function newStory(choice = null) {
  const paragraph = await fetchStoryParagraph(choice);
  const wordsDiv = document.getElementById('words');
  wordsDiv.innerHTML = '';

  paragraph.split(' ').forEach(w => {
    wordsDiv.innerHTML += formatWord(w);
  });

  addClass(document.querySelector('.word'), 'current');
  addClass(document.querySelector('.letter'), 'current');
  document.getElementById('info').innerHTML = "WPM: 0";
  window.timer = null;
  window.gameStart = null;

  // save last paragraph for choices later
  window.lastParagraph = paragraph;


  const res = await fetch("/api/choices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lastParagraph: paragraph })
  });
  const data = await res.json();
  showChoices(data.choices);
}


function showChoices(options) {
  const choicesDiv = document.getElementById('choices');
  choicesDiv.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => {
      choicesDiv.innerHTML = '';
      newStory(opt);
    };
    choicesDiv.appendChild(btn);
  });
}


// Light mode toggle js here 
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;


    const applyTheme = (theme) => {
        if (theme === 'light') {
            body.classList.add('light-mode');
        } else {
            body.classList.remove('light-mode');
        }
    };

    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);


    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('light-mode');


        if (body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'dark');
        }
    });
    

});




newStory();
