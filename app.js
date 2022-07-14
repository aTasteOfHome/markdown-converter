const fs = require('fs/promises');
const readline = require('readline');

/**
 * Conversion rules
 * 
| Markdown                               | HTML                                              |
| -------------------------------------- | ------------------------------------------------- |
| `# Heading 1`                          | `<h1>Heading 1</h1>`                              | 
| `## Heading 2`                         | `<h2>Heading 2</h2>`                              | 
| `...`                                  | `...`                                             | 
| `###### Heading 6`                     | `<h6>Heading 6</h6>`                              | 
| `Unformatted text`                     | `<p>Unformatted text</p>`                         | 
| `[Link text](https://www.example.com)` | `<a href="https://www.example.com">Link text</a>` | 
| `Blank line`                           | `Ignored`                                         |

 */

class MarkdownConverter {
    constructor(writeStream) {
        this.writeStream = writeStream;
        this.lines = [];
    }

    convertLine(line) {
        const trimmedLine = line.trim();
        if (!line || !line.trim()) {
            this.endParagraphSection();
            this.lines = [];
            this.writeStream.write('\n');
            return;
        };

        let ret = '';
        
        //assuming that headers can't happen in the middle of a line
        let headerNum = 0;
        while (trimmedLine[headerNum] === '#') {
            headerNum++;
        }
    
        //represents the last index visited in the line
        //I could use a ternary here, but I decided an if statement was more readable. For some, 
        // a ternary may be more readable: I'd defer to the team's preference
        let finalNdx = headerNum;
    
        //I got fancy with generators here. Probably not good practice, but boy was it fun
        for (const ndxes of getMarkdownLinkIndices(trimmedLine)) {
            const before = trimmedLine.substring(finalNdx, ndxes['[']);
            const url = trimmedLine.substring(ndxes['('] + 1, ndxes[')']);
            const urlTxt = trimmedLine.substring(ndxes['['] + 1, ndxes[']']);
            finalNdx = ndxes[')'] + 1;
            ret = `${ret}${before}<a href="${url}">${urlTxt}</a>`;
        }
    
        ret = `${ret}${trimmedLine.substring(finalNdx, line.length)}`;
        if (headerNum) {
            this.endParagraphSection();
            ret = `<h${headerNum}>${ret}</h${headerNum}>\n`
            this.writeStream.write(ret);
        } else {
    
            //adding leading whitespace in the case of no header
            let counter = 0;
            while (/\s/.test(line[counter]) && line[counter]) {
                ret = ret.shift(line[counter]);
            }

            if (!this.lines.length) {
                ret = `<p>${ret}\n`;
            } else {
                ret = ret + '\n';
            }
            this.lines.push(ret);
        }
    }

    endParagraphSection() {
        if (this.lines.length) {
            const lastLine = this.lines[this.lines.length - 1];
            this.lines[this.lines.length - 1] = lastLine.substring(0, lastLine.length - 1) + '</p>\n';
        }
        for (const line of this.lines) {
            console.log(line);
            this.writeStream.write(line);
        }
    }

    close() {
        this.endParagraphSection();
        this.writeStream.close();
    }
}

function* getMarkdownLinkIndices(line) {
    let ret = {};
    const charOrder = ['[', ']', '(', ')'];
    let charToSearch = 0;
    for (let i = 0; i <= line.length; i++) {
        if (line[i] !== charOrder[charToSearch]) continue;
        ret[charOrder[charToSearch]] = i; 

        if (charToSearch >= charOrder.length - 1) {
            yield ret;
            ret = {};
        }

        charToSearch = (charToSearch + 1) % charOrder.length;
    }
    return;
}

//streaming to handle large files, making that lines will not be egregiously long to the point where it bricks the machine's memory
async function run() {
    const args = process.argv.slice(2);
    const inFile = await fs.open(args[0], 'r');
    const outFile = await fs.open(args[1] || 'output.html', 'a');
    const rl = readline.createInterface({
        input: inFile.createReadStream()
    });

    const converter = new MarkdownConverter(outFile.createWriteStream());
    for await (const line of rl) {
        converter.convertLine(line);
    }
    converter.close();
    rl.close();
    inFile.close();
}

run();