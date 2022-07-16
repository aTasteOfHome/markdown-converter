const express = require('express');
const fs = require('fs/promises');
const readline = require('readline');
const MarkdownConverter = require('./markdown-converter');

const app = express();
const port = 3000;
const dataDirectory = __dirname + '/data';
const defaultInFilename = dataDirectory + '/test0.md';
const defaultOutFilename = dataDirectory + '/output.html';

app.use(express.text());
app.use(express.raw());

app.get('/', async (req, res, next) => {
    try {
        const filenames = await fs.readdir(dataDirectory);
        const markdownFiles = filenames.filter((filename) => filename.substring(filename.length-2, filename.length) === 'md');
        const htmlFileList = markdownFiles.map((filename) => `<li>${filename}</li>`);
        const htmlToReturn = `<h1>Convertible files</h1>\n<p>Use the path: convert/&lt;filename&gt;</p>\n<ul>${htmlFileList.join('\n')}</ul>`;
        res.send(htmlToReturn);
    } catch (e) {
        next(e);
    }
});

app.get('/convert', async (req, res, next) => {
    try {
        await runFromFilename(defaultInFilename, defaultOutFilename);
        res.sendFile(defaultOutFilename);
    } catch (e) {
        next(e);
    }
});

app.get('/convert/:inFilename', async (req, res, next) => {
    try {
        await runFromFilename(`${__dirname}/data/${req.params.inFilename}`, defaultOutFilename);
        res.sendFile( defaultOutFilename);
    } catch (e) {
        next(e);
    }
});

// /**
//  * works with Content-Type: 
//  *  text/plain
//  *  application/octet-stream
//  *  multipart/form-data
//  */
// app.post('/', async (req, res) => {
//     const form = formidable({ 
//         uploadDir: __dirname + '/input',
//         multiples: true
//     });

//     const {fields, files } = await new Promise((resolve, reject) => {
//         form.parse(req, async (err, fields, files) => {
//             if (err) return reject(err);
//             else return { fields, files };
//         });
//     });

//     //handle text and binary input
//     let body = req.body;
//     if (typeof body !== 'string' && body) {
//         body = String(body);
//     }

//     inFileStream = Readable.from(body);

//     const outFile = await fs.open(defaultOutFilename, 'a');
//     const outFileStream = outFile.createWriteStream();

//     await run(inFileStream, outFileStream);

//     await Promise.all([
//         inFileStream.close(),
//         outFileStream.close()
//     ]);

//     // res.sendFile( __dirname + '/' + defaultOutFilename);
// });


async function runFromFilename(inFilename, outFilename) {
    const inFile = await fs.open(inFilename, 'r');
    const inFileStream = inFile.createReadStream();

    const outFile = await fs.open(outFilename, 'a');
    await outFile.truncate(0);
    const outFileStream = outFile.createWriteStream();

    await run(inFileStream, outFileStream);

    await Promise.all([
        inFileStream.close(),
        inFile.close(),
        outFileStream.close(),
        outFile.close()
    ]);
    // Assuming the person you sent a handle to will close the thread for you can be a path to madness.
    // then again, assuming the owner will close can also lead to madness. This problem is generally solved by
    // convention or explicit tools in the language or framework itself, but philosophies vary.
}

//streaming to handle large files, making that lines will not be egregiously long to the point where it bricks the machine's memory
async function run(inFileStream, outFileStream) {
    const inFileLineReader = readline.createInterface({
        input: inFileStream
    });
    const converter = new MarkdownConverter(outFileStream);

    for await (const line of inFileLineReader) {
        await converter.convertLine(line);
    }

    await converter.close();
    await inFileLineReader.close();
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});

module.exports = app;