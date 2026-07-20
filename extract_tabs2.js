const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\it_cs\\.gemini\\antigravity-ide\\brain\\51d8267f-714c-410e-9db4-f627ea3bc3a5\\.system_generated\\steps\\10\\content.md', 'utf8');

const regex = /class="goog-inline-block docs-sheet-tab-caption">([^<]+)<\/div>/g;
let match;
while ((match = regex.exec(html)) !== null) {
    console.log("Tab Name:", match[1]);
}

const regex2 = /\[21350203,"\[\d+,\d+,\\\"(\d+)\\\",\[\{\\\"1\\\":\[\[\d+,\d+,\\\"([^\\\"]+)\\\"/g;
while ((match = regex2.exec(html)) !== null) {
    console.log("GID:", match[1], "Name:", match[2]);
}
