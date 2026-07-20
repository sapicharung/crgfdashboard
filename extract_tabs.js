const fs = require('fs');

const html = fs.readFileSync('C:\\Users\\it_cs\\.gemini\\antigravity-ide\\brain\\51d8267f-714c-410e-9db4-f627ea3bc3a5\\.system_generated\\steps\\10\\content.md', 'utf8');

// Looking for sheet names and gids
const regex = /\["([^"]+)",(\d+)\]/g;
const matches = [];
let match;
while ((match = regex.exec(html)) !== null) {
    if (match[2].length > 5 || match[2] === "0") { // gids are usually 0 or large numbers
        matches.push({ name: match[1], gid: match[2] });
    }
}
console.log("Matches:", matches);

// Let's also try another pattern common in google sheets HTML
const regex2 = /\{[\w\s,]*?"name":"([^"]+)"[\w\s,]*?"gid":(\d+)/g;
const matches2 = [];
while ((match = regex2.exec(html)) !== null) {
    matches2.push({ name: match[1], gid: match[2] });
}
console.log("Matches2:", matches2);

// Or search for รพ
const lines = html.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('รพ')) {
        let index = 0;
        while ((index = lines[i].indexOf('รพ', index)) !== -1) {
            console.log("Found รพ at index", index, "context:", lines[i].substring(index - 50, index + 100));
            index++;
        }
    }
}
