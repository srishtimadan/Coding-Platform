/* STARTER CODE SHOWN IN THE EDITOR */
const starters = {
    js: `function reverseString(s) {
  let result = '';
  for (let i = s.length - 1; i >= 0; i--) {
    result += s[i];
  }
  return result;
}`,

    java: `class Solution {
    public String reverseString(String s) {
        String result = "";
        for (int i = s.length() - 1; i >= 0; i--) {
            result += s.charAt(i);
        }
        return result;
    }
}`
};

/* VISIBLE TEST CASES (s = input string, e = expected) */
const tests = [
    { s: 'hello', e: 'olleh' },
    { s: 'CodeForge', e: 'egroFedoC' },
    { s: 'a', e: 'a' }
];

/* SOLUTIONS TAB CONTENT */
const sols = [
    {
        t: 'Loop backwards',
        c: 'O(n) time, O(n) space',
        d: 'Start at the last character and walk back to the first, adding each character to a new string. It’s the most direct way to think about the problem.',
        js: `function reverseString(s) {
  let result = '';
  for (let i = s.length - 1; i >= 0; i--) {
    result += s[i];
  }
  return result;
}`,
        java: `class Solution {
    public String reverseString(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = s.length() - 1; i >= 0; i--) {
            sb.append(s.charAt(i));
        }
        return sb.toString();
    }
}`
    },
    {
        t: 'Two pointers',
        c: 'O(n) time, O(n) space',
        d: 'Put the characters in an array, then keep one pointer at the start and one at the end. Swap the two characters, move both pointers inward, and stop when they meet. Strings can’t be changed in place, so the array is a copy.',
        js: `function reverseString(s) {
  const chars = s.split('');
  let left = 0;
  let right = chars.length - 1;
  while (left < right) {
    const tmp = chars[left];
    chars[left] = chars[right];
    chars[right] = tmp;
    left++;
    right--;
  }
  return chars.join('');
}`,
        java: `class Solution {
    public String reverseString(String s) {
        char[] chars = s.toCharArray();
        int left = 0;
        int right = chars.length - 1;
        while (left < right) {
            char tmp = chars[left];
            chars[left] = chars[right];
            chars[right] = tmp;
            left++;
            right--;
        }
        return new String(chars);
    }
}`
    },
    {
        t: 'Built-in methods',
        c: 'O(n) time, O(n) space',
        d: 'Both languages can do it in one line. It’s great for real projects, but in an interview you’re usually expected to show how it works underneath.',
        js: `function reverseString(s) {
  return [...s].reverse().join('');
}`,
        java: `class Solution {
    public String reverseString(String s) {
        return new StringBuilder(s).reverse().toString();
    }
}`
    }
];

/* PAGE ELEMENTS */
const $ = id => document.getElementById(id);
const src = $('src');
const gut = $('gut');
const lang = $('lang');
const out = $('out');
const cases = $('cases');
const res = $('res');
const dbg = $('dbg');

/* PAGE STATE */
let results = [];       // results of the last test run
let sel = 0;            // selected test case button
let curLine = 0;        // line the debugger is stopped on
const bps = new Set();  // breakpoint line numbers

let steps = [];         // recorded debugger steps
let si = 0;             // current debugger step
let dlogs = [];         // console.log lines from the debugged code
let dres = '';          // value returned while debugging

const hist = [];        // submission history
let T0 = 0;             // submit start time

const problemName = document.querySelector('.pane.on h1')?.textContent.trim() || document.title.replace(/\s*·.*$/, '').trim() || 'Problem';
const API_BASE = window.location.origin;

async function loadSubmissionHistory() {
    try {
        const response = await fetch(`${API_BASE}/api/submissions?problem=${encodeURIComponent(problemName)}`);
        const data = await response.json();

        if (!response.ok || !Array.isArray(data.data)) {
            throw new Error('Unable to load history');
        }

        $('hist').innerHTML = data.data.length
            ? data.data.map(s =>
                '<p><strong style="color:var(--' + (s.verdict === 'Accepted' ? 'ok' : 'bad') + ')">' + esc(s.verdict) + '</strong> in ' +
                (s.language || 'JavaScript') + ', ' + (s.runtime_ms || 0) + ' ms, at ' + new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</p>'
            ).join('')
            : '<p>Your submissions will show up here.</p>';
    } catch (err) {
        $('hist').innerHTML = hist.length
            ? hist.map(h =>
                '<p><strong style="color:var(--' + (h.v === 'Accepted' ? 'ok' : 'bad') + ')">' + h.v + '</strong> in ' +
                h.lang + ', ' + h.ms + ' ms, at ' + h.at + '</p>'
            ).join('')
            : '<p>Your submissions will show up here.</p>';
    }
}

async function saveSubmissionToApi(options = {}) {
    try {
        await fetch(`${API_BASE}/api/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                problem: problemName,
                email: 'guest@local.test',
                language: lang.value === 'java' ? 'Java' : 'JavaScript',
                verdict: options.verdict || 'Unknown',
                runtime_ms: options.runtimeMs || 0,
                message: options.message || '',
                code: src.value
            })
        });
    } catch (err) {
        console.warn('Could not save submission to database:', err);
    }
}

/* SMALL HELPERS */
const esc = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/* EDITOR: LINE NUMBERS AND BREAKPOINTS */
function lines() {
    const count = src.value.split('\n').length;

    gut.innerHTML = Array.from({ length: count }, (_, i) => {
        const n = i + 1;
        return '<div class="ln' + (bps.has(n) ? ' bp' : '') + (n === curLine ? ' cur' : '') +
            '" data-n="' + n + '" title="Toggle breakpoint">' + n + '</div>';
    }).join('');

    src.style.height = src.scrollHeight + 'px';
}

/* Click a line number to add or remove a breakpoint */
gut.addEventListener('click', e => {
    const n = +e.target.dataset.n;
    if (!n) return;

    bps.has(n) ? bps.delete(n) : bps.add(n);
    lines();
});

/* EDITOR: LOAD STARTER CODE */
function load() {
    src.value = starters[lang.value];
    lines();
}

src.addEventListener('input', lines);

/* Tab key inserts two spaces */
src.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const s = src.selectionStart;
        src.setRangeText('  ', s, src.selectionEnd, 'end');
        lines();
    }
});

/* Cursor position (Ln, Col) */
['keyup', 'click'].forEach(ev => src.addEventListener(ev, () => {
    const v = src.value.slice(0, src.selectionStart).split('\n');
    $('pos').textContent = 'Ln ' + v.length + ', Col ' + (v[v.length - 1].length + 1);
}));

/* Language dropdown and Reset button */
lang.onchange = () => {
    load();
    renderSols();
};
$('reset').onclick = load;

/* LEFT TABS (PROBLEM, HINTS, SOLUTIONS, HISTORY) */
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
    document.querySelectorAll('nav button').forEach(x => x.setAttribute('aria-selected', x === b));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === b.dataset.p));
});

/* HINTS (CLICK TO REVEAL) */
document.querySelectorAll('.hint').forEach(h => {
    h.onclick = () => h.classList.toggle('open');
    h.onkeydown = e => {
        if (e.key === 'Enter') h.classList.toggle('open');
    };
});

/* JAVA SUPPORT: HELPERS THAT JAVA CODE EXPECTS */
const GEN = String.raw`<(?:[^<>]|<[^<>]*>)*>`;
const TYP = String.raw`(?:int|long|short|byte|boolean|double|float|char|String|[A-Z]\w*)(?:${GEN})?(?:\[\])*`;

const Integer = {
    MAX_VALUE: 2147483647,
    MIN_VALUE: -2147483648,
    compare: (a, b) => a - b,
    valueOf: x => x
};

const Arrays = {
    sort: (a, f) => a.sort(f || ((x, y) => x - y)),
    fill: (a, v) => a.fill(v),
    copyOf: (a, n) => Array.from({ length: n }, (_, i) => a[i] ?? 0),
    toString: a => '[' + a.join(', ') + ']'
};

/* new int[n][m] becomes __arr(n, m) */
function __arr(...d) {
    const [n, ...r] = d;
    return Array.from({ length: n }, () => r.length ? __arr(...r) : 0);
}

/* Add Java-style methods (put, containsKey, add, size...) to JS collections */
[
    [Map.prototype, {
        containsKey(k) { return this.has(k); },
        put(k, v) { const o = this.get(k); this.set(k, v); return o; },
        getOrDefault(k, d) { return this.has(k) ? this.get(k) : d; },
        containsValue(v) { return [...this.values()].includes(v); }
    }],
    [Set.prototype, {
        contains(k) { return this.has(k); }
    }],
    [Array.prototype, {
        add(v) { this.push(v); return true; },
        get(i) { return this[i]; },
        size() { return this.length; },
        isEmpty() { return this.length === 0; }
    }]
].forEach(([proto, methods]) => {
    Object.entries(methods).forEach(([name, fn]) => {
        Object.defineProperty(proto, name, { value: fn, writable: true, configurable: true });
    });
});

/* Java String helpers: StringBuilder, new String(chars), toCharArray() */
class StringBuilder {
    constructor(s = '') { this.s = String(s); }
    append(x) { this.s += x; return this; }
    reverse() { this.s = [...this.s].reverse().join(''); return this; }
    toString() { return this.s; }
    get length() { return this.s.length; }
    charAt(i) { return this.s.charAt(i); }
}

function __str(x) {
    return Array.isArray(x) ? x.join('') : String(x);
}

Object.defineProperty(String.prototype, 'toCharArray', {
    value: function () { return this.split(''); },
    writable: true,
    configurable: true
});

/* JAVA SUPPORT: CONVERT JAVA SOURCE TO JAVASCRIPT */
function javaToJs(j) {
    /* Remove comments, imports, annotations, final and casts */
    let c = j
        .replace(/\/\/.*/g, '')
        .replace(/^[ \t]*(?:import|package)[ \t]+[^;]*;/gm, '')
        .replace(/@\w+/g, '')
        .replace(/\bfinal\s+/g, '')
        .replace(/\((?:int|long|double)\)\s*/g, '');

    /* Strings: s.length() becomes s.length, new String(x) becomes __str(x) */
    c = c.replace(/\.length\(\)/g, '.length');
    c = c.replace(/new[ \t]+String\(/g, '__str(').replace(/String\.valueOf\(/g, '__str(');

    /* Collections: HashMap, HashSet, ArrayList */
    c = c.replace(new RegExp(String.raw`new[ \t]+(?:HashMap|TreeMap|LinkedHashMap)(?:${GEN})?[ \t]*\(\)`, 'g'), 'new Map()');
    c = c.replace(new RegExp(String.raw`new[ \t]+(?:HashSet|TreeSet|LinkedHashSet)(?:${GEN})?[ \t]*\(\)`, 'g'), 'new Set()');
    c = c.replace(new RegExp(String.raw`new[ \t]+(?:ArrayList|LinkedList)(?:${GEN})?[ \t]*\(\)`, 'g'), '[]');

    /* Arrays: new int[]{1, 2} and new int[n][m] */
    c = c.replace(/new[ \t]+(?:int|long|double|boolean)\[\][ \t]*\{([^}]*)\}/g, '[$1]');
    c = c.replace(/new[ \t]+(?:int|long|double|boolean|Integer)((?:\[[^\[\]]+\])+)/g,
        (m, d) => '__arr(' + d.slice(1, -1).split('][').join(',') + ')');

    /* Exceptions */
    c = c.replace(/new[ \t]+(?:IllegalArgumentException|RuntimeException|Exception)\(/g, 'new Error(');

    /* For-each loop: for (int x : nums) */
    c = c.replace(new RegExp(String.raw`for[ \t]*\([ \t]*${TYP}[ \t]+(\w+)[ \t]*:[ \t]*([^)]+)\)`, 'g'), 'for (let $1 of $2)');

    /* Method signatures become JS functions */
    c = c.replace(
        new RegExp(String.raw`(?:(?:public|private|protected|static)[ \t]+)*(${TYP})[ \t]+(\w+)[ \t]*\(([^)]*)\)[ \t]*(?:throws[ \t]+[\w, ]+)?\{`, 'g'),
        (m, ty, n, p) => {
            if (/^(if|for|while|switch|catch|else|return|new|synchronized|throw)$/.test(n)) return m;

            const params = p.split(/,(?![^<]*>)/)
                .filter(s => s.trim())
                .map(s => s.trim().split(/\s+/).pop())
                .join(', ');

            return 'function ' + n + '(' + params + ') {';
        }
    );

    /* Typed variables become let */
    c = c.replace(new RegExp(String.raw`\b${TYP}[ \t]+(\w+)[ \t]*(?==|;|,)`, 'g'), 'let $1');

    /* Remove the class wrapper */
    c = c.replace(/class[ \t]+\w+[ \t]*\{/, '').replace(/\}\s*$/, '');

    return c;
}

/* The code that will actually run (Java is converted first) */
function code() {
    return lang.value === 'java' ? javaToJs(src.value) : src.value;
}

/* RUN TESTS */
function show() {
    cases.innerHTML = '';

    /* One button per test case */
    results.forEach((r, i) => {
        const b = document.createElement('button');
        b.className = 'case ' + (r.pass ? 'pass' : 'fail');
        b.textContent = 'Case ' + (i + 1) + (r.pass ? ' ✓' : ' ✗');
        b.setAttribute('aria-pressed', i === sel);
        b.onclick = () => {
            sel = i;
            show();
        };
        cases.appendChild(b);
    });

    const r = results[sel];
    const t = tests[sel];
    const all = results.every(x => x.pass);

    out.innerHTML =
        '<div class="verdict ' + (all ? 'ok' : 'bad') + '">' +
        (all ? 'All ' + results.length + ' cases passed' : results.filter(x => x.pass).length + ' of ' + results.length + ' cases passed') +
        '</div>' +
        'input: <strong>s = ' + esc(JSON.stringify(t.s)) + '</strong><br>' +
        'expected: <strong>' + esc(JSON.stringify(t.e)) + '</strong><br>' +
        'yours: <strong>' + esc(r.err ? r.err : JSON.stringify(r.got)) + '</strong>';

    return all;
}

function run() {
    stopDebug();

    results = tests.map(t => {
        try {
            const f = new Function(code() + '\nreturn reverseString;')();
            const got = f(t.s);

            return { pass: got === t.e, got: got };
        } catch (e) {
            return { pass: false, err: e.message };
        }
    });

    sel = Math.max(0, results.findIndex(r => !r.pass));
    return show();
}

/* DEBUGGER: RECORD A STEP (CALLED FROM THE INSTRUMENTED CODE) */
function __s(n, v) {
    if (steps.length >= 3000) throw new Error('Stopped after 3000 steps');
    steps.push({ n, v });
}

/* DEBUGGER: ADD A STEP RECORDER BEFORE EACH STATEMENT */
function instrument(source) {
    /* Collect variable names to watch */
    const names = new Set(['s']);
    const re = /\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = re.exec(source))) names.add(m[1]);

    /* Snippet that captures the current value of each variable */
    const cap = '(()=>{const o={};' +
        [...names].map(n => 'try{o.' + n + '=' + n + '}catch(e){}').join('') +
        'return o})()';

    let inFn = false;
    let prev = '';

    return source.split('\n').map((l, i) => {
        const t = l.trim();
        let line = l;

        if (inFn && t && !t.startsWith('}') && !t.startsWith('else') &&
            /[;{}]$/.test(prev) &&
            /^(for|if|while|return|let|const|var|[A-Za-z_$][\w$.\[\]]*\s*(=[^=]|\+=|-=|\+\+|--)|[A-Za-z_$][\w$.\[\]]*\()/.test(t)) {
            line = '__s(' + (i + 1) + ',' + cap + ');' + l;
        }

        if (/function\s+\w+/.test(t)) inFn = true;
        if (t) prev = t;

        return line;
    }).join('\n');
}

/* DEBUGGER: START */
function startDebug() {
    res.hidden = true;
    dbg.hidden = false;
    $('dvars').innerHTML = '';
    $('dlog').textContent = '';

    /* Read the custom input */
    const s = $('din').value;
    if (s === '') {
        $('dctl').hidden = true;
        $('dstate').textContent = 'Type some text to reverse, for example hello.';
        return;
    }

    steps = [];
    dlogs = [];
    dres = '';

    /* Capture console.log output from the user's code */
    const con = {
        log: (...a) => dlogs.push(
            a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')
        )
    };

    try {
        const f = new Function('__s', 'console', instrument(code()) + '\nreturn reverseString;')(__s, con);
        dres = JSON.stringify(f(s));
    } catch (e) {
        dres = 'Error: ' + e.message;
    }

    $('dctl').hidden = false;

    /* Start at the first breakpoint, or at step 1 */
    const first = steps.findIndex(st => bps.has(st.n));
    si = first >= 0 ? first : 0;
    paint();
}

/* DEBUGGER: SHOW THE CURRENT STEP */
function paint() {
    const s = steps[si];
    curLine = s ? s.n : 0;
    lines();

    $('dstate').innerHTML =
        (s ? 'Step <strong>' + (si + 1) + '</strong> of ' + steps.length + ', line <strong>' + s.n + '</strong>'
           : 'No steps were recorded. Check that your function is named reverseString.') +
        '<br>Returned: <strong>' + esc(dres) + '</strong>';

    $('dvars').innerHTML = s
        ? '<table>' + Object.entries(s.v).map(([k, v]) =>
            '<tr><td>' + k + '</td><td>' + esc(v === undefined ? 'undefined' : JSON.stringify(v)) + '</td></tr>'
          ).join('') + '</table>'
        : '';

    $('dlog').textContent = dlogs.length ? dlogs.join('\n') : 'console.log output will appear here.';
}

/* DEBUGGER: STOP AND RETURN TO RESULTS */
function stopDebug() {
    dbg.hidden = true;
    res.hidden = false;
    curLine = 0;
    lines();
}

/* DEBUGGER BUTTONS */
$('debug').onclick = startDebug;
$('dgo').onclick = startDebug;
$('dstop').onclick = stopDebug;

$('dprev').onclick = () => {
    if (si > 0) {
        si--;
        paint();
    }
};

$('dnext').onclick = () => {
    if (si < steps.length - 1) {
        si++;
        paint();
    }
};

$('drest').onclick = () => {
    si = 0;
    paint();
};

$('dcont').onclick = () => {
    let j = si + 1;
    while (j < steps.length && !bps.has(steps[j].n)) j++;
    si = j < steps.length ? j : steps.length - 1;
    paint();
};

$('run').onclick = run;

/* SUBMIT: GENERATE 20 HIDDEN TEST CASES */
function gen() {
    const t = [];
    let seed = 7;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?-_';
    const pick = n => Array.from({ length: n }, () => chars[Math.floor(r() * chars.length)]).join('');

    while (t.length < 20) {
        let s;

        if (t.length < 3) {
            /* Single characters */
            s = pick(1);
        } else if (t.length % 5 === 4) {
            /* Palindromes (the same forwards and backwards) */
            const half = pick(1 + Math.floor(r() * 10));
            s = half + [...half].reverse().join('');
        } else {
            s = pick(2 + Math.floor(r() * 48));
        }

        t.push({ s: s, e: [...s].reverse().join('') });
    }

    return t;
}

/* SUBMIT: CHECK THAT THE ANSWER IS THE REVERSED STRING */
function valid(g, c) {
    return g === c.e;
}

/* SUBMIT: SHOW THE VERDICT AND ADD IT TO HISTORY */
function finish(v, msg, c, k, total, got) {
    const ms = Math.max(1, Math.round(performance.now() - T0));
    const ok = v === 'Accepted';

    saveSubmissionToApi({ verdict: v, message: msg || '', runtimeMs: ms });

    hist.unshift({
        v,
        ms,
        lang: lang.value === 'java' ? 'Java' : 'JavaScript',
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    $('hist').innerHTML = hist.map(h =>
        '<p><strong style="color:var(--' + (h.v === 'Accepted' ? 'ok' : 'bad') + ')">' + h.v + '</strong> in ' +
        h.lang + ', ' + h.ms + ' ms, at ' + h.at + '</p>'
    ).join('');

    let html = '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + v + '</div>' +
        k + ' of ' + total + ' test cases passed, runtime <strong>' + ms + ' ms</strong>';

    if (msg) html += '<br>message: <strong>' + esc(msg) + '</strong>';

    if (c) {
        html += '<br>failed on case ' + (k + 1) +
            '<br>input: <strong>s = ' + esc(JSON.stringify(c.s)) + '</strong>' +
            '<br>expected: <strong>' + esc(JSON.stringify(c.e)) + '</strong>' +
            (v === 'Wrong Answer' ? '<br>yours: <strong>' + esc(got === undefined ? 'undefined' : JSON.stringify(got)) + '</strong>' : '');
    }

    out.innerHTML = html;
}

/* SUBMIT: RUN ALL CASES, STOP AT THE FIRST FAILURE */
function submit() {
    stopDebug();
    cases.innerHTML = '';
    T0 = performance.now();

    const all = [...tests.map(x => ({ s: x.s, e: x.e })), ...gen()];
    let fn;

    try {
        fn = new Function(code() + '\nreturn reverseString;')();
    } catch (e) {
        finish('Compile Error', e.message, null, 0, all.length);
        return;
    }

    for (let k = 0; k < all.length; k++) {
        const c = all[k];
        let got;

        try {
            got = fn(c.s);
        } catch (e) {
            finish('Runtime Error', e.message, c, k, all.length);
            return;
        }

        if (!valid(got, c)) {
            finish('Wrong Answer', null, c, k, all.length, got);
            return;
        }
    }

    finish('Accepted', null, null, all.length, all.length);
}

$('submit').onclick = submit;

/* SOLUTIONS TAB: SHOW CARDS IN THE SELECTED LANGUAGE */
function renderSols() {
    $('solList').innerHTML = sols.map((s, i) =>
        '<div class="sol"><h3>' + s.t + '</h3>' +
        '<p class="cx">' + s.c + '</p>' +
        '<p>' + s.d + '</p>' +
        '<pre><code>' + esc(s[lang.value]) + '</code></pre>' +
        '<div class="drow">' +
        '<button class="pill" data-copy="' + i + '">Copy code</button>' +
        '<button class="pill" data-load="' + i + '">Load in editor</button>' +
        '<button class="pill" data-debug="' + i + '">Debug this solution</button>' +
        '</div></div>'
    ).join('');
}

/* SOLUTIONS TAB: COPY AND LOAD BUTTONS */
$('solList').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;

    if (b.dataset.debug !== undefined) {
        src.value = sols[+b.dataset.debug][lang.value];
        lines();
        startDebug();
        b.textContent = 'Debugging';
    } else if (b.dataset.load !== undefined) {
        src.value = sols[+b.dataset.load][lang.value];
        lines();
        b.textContent = 'Loaded';
    } else if (b.dataset.copy !== undefined) {
        try {
            navigator.clipboard.writeText(sols[+b.dataset.copy][lang.value]).then(
                () => b.textContent = 'Copied',
                () => b.textContent = 'Copy blocked'
            );
        } catch (x) {
            b.textContent = 'Copy blocked';
        }
    }

    /* Put the button label back after a moment */
    setTimeout(() => {
        b.textContent = b.dataset.debug !== undefined ? 'Debug this solution' : b.dataset.load !== undefined ? 'Load in editor' : 'Copy code';
    }, 1500);
});

/* THEME BUTTON (LIGHT / DARK) */
$('theme').onclick = () => {
    const r = document.documentElement;
    const isDark = getComputedStyle(r).getPropertyValue('--bg').trim() === '#0e1020';
    r.dataset.theme = isDark ? 'light' : 'dark';
};

/* START THE PAGE */
load();
renderSols();
loadSubmissionHistory();