let overlayElement;

function createOverlay() {
    overlayElement = document.createElement('div');
    overlayElement.style.position = 'absolute';
    overlayElement.style.top = '10px';
    overlayElement.style.left = '10px';
    overlayElement.style.color = 'white';
    overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlayElement.style.padding = '10px';
    overlayElement.style.fontFamily = 'monospace';
    document.body.appendChild(overlayElement);
}

function updateOverlay(stats) {
    if (!overlayElement) return;

    overlayElement.innerHTML = `
        Source FPS: ${stats.sourceFps}<br>
        Interpolated FPS: ${stats.interpolatedFps}<br>
        Ping: ${stats.ping} ms<br>
        Bitrate: ${stats.bitrate} Mbps
    `;
}

function toggleOverlay() {
    if (overlayElement) {
        overlayElement.style.display = overlayElement.style.display === 'none' ? 'block' : 'none';
    }
}

module.exports = {
    createOverlay,
    updateOverlay,
    toggleOverlay
};
