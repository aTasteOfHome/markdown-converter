const express = require('express');
const fs = require('fs/promises');
const readline = require('readline');
const MarkdownConverter = require('./markdown-converter');

const app = express();
const outFilename = 'testoutput.html';

app.get('/', async (req, res) => {
    await run();
    res.sendFile( __dirname + "/" + outFilename);
});

app.get('/:inFilename', async (req, res) => {
    await run(req.params.inFilename);
    res.sendFile( __dirname + "/" + outFilename);
});

//streaming to handle large files, making that lines will not be egregiously long to the point where it bricks the machine's memory
async function run(inFilename = 'test0.md') {
    const inFile = await fs.open(inFilename, 'r');
    const outFile = await fs.open(outFilename, 'a');
    await outFile.truncate(0);

    const inFileLineReader = readline.createInterface({
        input: inFile.createReadStream()
    });
    const outFileWriteStream = outFile.createWriteStream();
    const converter = new MarkdownConverter(outFileWriteStream);

    for await (const line of inFileLineReader) {
        await converter.convertLine(line);
    }

    await converter.close();
    await Promise.all([
        inFileLineReader.close(),
        inFile.close(),
        outFileWriteStream.close(),
        outFile.close()
    ]);
     //will close the write stream if the converter didn't close it already. 
    // Assuming the person you sent a handle to will close the thread for you can be a path to madness.
    // then again, assuming the owner will close can also lead to madness. This problem is generally solved by
    // convention or explicit tools in the language or framework itself, but philosophies vary.
}



module.exports = run;