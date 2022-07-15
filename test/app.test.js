// I don't have granular unit functions here since I found it more useful to just
//  test the actual conversion, rather than specific steps of my idiosyncratic
//  implementation of the conversion.
// I try to follow the guideline of "break down your unit tests to the point until breaking it further wastes your time"
//  In this case, breaking it down further wouldn't make sense, at least with my specific implementation.
//  This could be an argument against my particular implementation; the difficulty in refactoring it.
const app = require('../app');
const fs = require('fs/promises');


//not good to have function in your test file that could themselves require testing: another argument against my current design
function compareFileStrings(a, b) {
    let ai = 0;
    let bi = 0;

    while (ai <= a.length && bi <= b.length) {
        if (!a[ai]) {
            ai++;
        }
        if (!b[bi]) {
            bi++;
        }
        if (a[ai] && b[bi]) {
            expect(a[ai]).toBe(b[bi]);
            ai++;
            bi++;
        }
    }
}

test('test0 from email', async () => {
    await app('test/test0.md', 'test/output.html');
    const [actualBuf, expectedBuf] = await Promise.all([
        fs.readFile('./test/output.html'),
        fs.readFile('./test/expected0.html')
    ]);

    const actual = String(actualBuf).trim();
    const expected = String(expectedBuf);
    compareFileStrings(actual, expected);
});

test('test1 from email', async () => {
    await app('test/test1.md', 'test/output.html');
    const [actualBuf, expectedBuf] = await Promise.all([
        fs.readFile('./test/output.html'),
        fs.readFile('./test/expected1.html')
    ]);

    const actual = String(actualBuf).split('\n');
    const expected = String(expectedBuf).split('\n');
    
    compareFileStrings(actual, expected);
});

test('test-empty', async () => {
    await app('test/test-empty.md', 'test/output.html');
    const [actualBuf, expectedBuf] = await Promise.all([
        fs.readFile('./test/output.html'),
        fs.readFile('./test/expected-empty.html')
    ]);

    const actual = String(actualBuf).split('\n');
    const expected = String(expectedBuf).split('\n');
    
    compareFileStrings(actual, expected);
});

test('test-header-fun', async () => {
    await app('test/test-empty.md', 'test/output.html');
    const [actualBuf, expectedBuf] = await Promise.all([
        fs.readFile('./test/output.html'),
        fs.readFile('./test/expected-header-fun.html')
    ]);

    const actual = String(actualBuf).split('\n');
    const expected = String(expectedBuf).split('\n');
    
    compareFileStrings(actual, expected);
});

test('test-paragraph-fun', async () => {
    await app('test/test-paragraph-fun.md', 'test/output.html');
    const [actualBuf, expectedBuf] = await Promise.all([
        fs.readFile('./test/output.html'),
        fs.readFile('./test/expected-paragraph-fun.html')
    ]);

    const actual = String(actualBuf).split('\n');
    const expected = String(expectedBuf).split('\n');
    
    compareFileStrings(actual, expected);
});

test('test-html-escape', async () => {
    await app('test/test-empty.md', 'test/output.html');
    const [actualBuf, expectedBuf] = await Promise.all([
        fs.readFile('./test/output.html'),
        fs.readFile('./test/expected-html-escape.html')
    ]);

    const actual = String(actualBuf).split('\n');
    const expected = String(expectedBuf).split('\n');
    
    compareFileStrings(actual, expected);
});
