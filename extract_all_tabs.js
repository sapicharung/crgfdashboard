const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\it_cs\\.gemini\\antigravity-ide\\brain\\51d8267f-714c-410e-9db4-f627ea3bc3a5\\.system_generated\\steps\\68\\content.md', 'utf8');

const tabsRegex = /\[\d+,\d+,\\"(\d+)\\\",\[\{\\\"1\\\":\[\[\d+,\d+,\\"([^\\"]+)\\"/g;
let match;
while ((match = tabsRegex.exec(html)) !== null) {
    console.log("Found:", match[1], match[2]);
}

const altRegex = /\[(\d+),"([^"]+)"/g;
while ((match = altRegex.exec(html)) !== null) {
    if (match[2].includes('รพ.')) {
        console.log("Alt Found:", match[1], match[2]);
    }
}
