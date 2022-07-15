const escapeHtml = require('escape-html');
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

Assumptions made:
    whitespace preceding headings are ignored
    headings cannot happen in the middle of a line, i.e.:
        `Unformatted text ## Heading 2`
    
 */

//all of this complexity is to handle whitespaces and paragraphs that cover multiple lines
//Was debating to make a far simpler solution but opted not to in order to match the desired outputs exactly
class MarkdownConverter {
    constructor(writeStream) {
        this.writeStream = writeStream;

        //The entire reason I needed to make a class was to store this state, for multi-line paragraph blocks.
        //  as well as to abstract the need to handle such details from the run function, which in my mind
        //  only handles file manipulation.
        //Possibly overkill; I did my best to keep things readable in the meantime
        this.lines = [];
    }

    async convertLine(line) {
        if (!line) {
            await this.endParagraphSection();
            return;
        };
        
        let headerNum = 0;
        while (line[headerNum] === '#') {
            headerNum++;
        }
    
        //represents the last index visited in the line
        let lastNdx = headerNum;
        // if there's a single space after the header symbols, omit it
        if (lastNdx && line[lastNdx] === ' ') lastNdx++;
    

        let ret = '';
        //I got fancy with generators here. Probably not good practice, but boy was it fun
        //tried to keep it as simple as possible to make it readable, with middling success, but I did enjoy the challenge
        for (const ndxes of this.getMarkdownLinkIndices(line)) {
            const textBeforeLink = line.substring(lastNdx, ndxes['[']);
            const link = line.substring(ndxes['('] + 1, ndxes[')']);
            const linkText = line.substring(ndxes['['] + 1, ndxes[']']);
            lastNdx = ndxes[')'] + 1;
            //escaping any html characters before converting them to html
            ret = `${ret}${escapeHtml(textBeforeLink)}<a href="${escapeHtml(link)}">${escapeHtml(linkText)}</a>`;
        }
    
        ret = `${ret}${line.substring(lastNdx, line.length)}`;
        if (headerNum) {
            await this.endParagraphSection();
            ret = `<h${headerNum}>${ret}</h${headerNum}>\n`;
            await this.writeStream.write(ret);
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

    async endParagraphSection() {
        if (this.lines.length) {
            let lastLine = this.lines[this.lines.length - 1];

            //replace newline character if there so the paragraph symbol is in-line with the previous text
            if (lastLine[lastLine.length - 1] === '\n') {
                lastLine = lastLine.substring(0, lastLine.length - 1);
            }
            this.lines[this.lines.length - 1] = lastLine + '</p>\n';
        }
        for (const line of this.lines) {
            await this.writeStream.write(line);
        }
        await this.writeStream.write('\n');
        this.lines = [];
    }

    //generator function
    * getMarkdownLinkIndices(line) {
        let ret = {};
        const charOrder = ['[', ']', '(', ')'];
        let charToSearch = 0;
        for (let i = 0; i <= line.length; i++) {
            if (line[i] !== charOrder[charToSearch]) continue;
            
            //store the index that we find a particular character into the returned object
            ret[charOrder[charToSearch]] = i; 

            if (charToSearch >= charOrder.length - 1) {
                yield ret;
                ret = {};
            }

            charToSearch = (charToSearch + 1) % charOrder.length;
        }
        return;
    }

    async close() {
        //clean out any remaining lines that were unaccounted for
        await this.endParagraphSection();
        await this.writeStream.close();
    }
}

module.exports = MarkdownConverter;