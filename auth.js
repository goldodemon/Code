const { session } = require('electron');

// This is where we will define the logic for intercepting and modifying the session request.

function spoofUserAgent() {
    // The User-Agent for the native Windows client.
    const nativeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 GFN/3.0.21.108/Windows (Tesla)';
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = nativeUserAgent;
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
}

function interceptSessionRequest() {
    const filter = {
        urls: ['*://*.nvidia.com/*']
    };

    session.defaultSession.webRequest.onBeforeRequest(filter, async (details, callback) => {
        if (details.method === 'POST' && details.uploadData) {
            const body = JSON.parse(details.uploadData[0].bytes.toString('utf8'));

            // This is where we would modify the session request.
            // For now, we'll just log it.
            console.log('Original session request:', body);

            const modifiedBody = {
                ...body,
                width: 3840,
                height: 2160,
                max_fps: 120,
                max_bitrate: 75000
            };

            console.log('Modified session request:', modifiedBody);

            // We would need to re-encode the body and set it back to the request.
            // This is a simplified example.
        }
        callback({});
    });
}

module.exports = {
    spoofUserAgent,
    interceptSessionRequest
};
