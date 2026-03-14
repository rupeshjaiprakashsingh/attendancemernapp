const https = require('https');

const keepAwake = (url, mins = 14) => {
    const intervalMs = mins * 60 * 1000;
    
    setInterval(() => {
        https.get(url, (res) => {
            console.log(`[KeepAwake] Pinged ${url} - Status: ${res.statusCode}`);
        }).on('error', (err) => {
            console.error(`[KeepAwake] Error pinging ${url}: `, err.message);
        });
    }, intervalMs);

    console.log(`[KeepAwake] Initialized. Pinging ${url} every ${mins} minutes.`);
};

module.exports = keepAwake;
