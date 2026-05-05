const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
const overlay = require('./overlay');

if (!gl) {
  console.error('WebGL 2.0 not available');
  document.body.innerHTML = 'This browser does not support WebGL 2.0.';
}

let interpolationProgram, fsrProgram;
let quadVertexBuffer;
let prevFrameTexture, currFrameTexture;
let interpolationFramebuffer, fsrFramebuffer;
let videoElement; // This will be our video source

async function main() {
    const vertexShaderSource = await fetch('./vertex.vert').then(res => res.text());
    const interpolationShaderSource = await fetch('./interpolation.frag').then(res => res.text());
    const fsrShaderSource = await fetch('./fsr.frag').then(res => res.text());

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const interpolationFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, interpolationShaderSource);
    const fsrFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsrShaderSource);

    interpolationProgram = createProgram(gl, vertexShader, interpolationFragmentShader);
    fsrProgram = createProgram(gl, vertexShader, fsrFragmentShader);

    const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
    quadVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer);
    const posAttrib = gl.getAttribLocation(interpolationProgram, "a_position");
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Create textures
    prevFrameTexture = createTexture(gl);
    currFrameTexture = createTexture(gl);

    // Placeholder for WebRTC video stream
    videoElement = document.createElement('video');
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.src = 'placeholder.mp4'; // We'll need a placeholder video
    videoElement.play();

    interpolationFramebuffer = createFramebuffer(gl, 1920, 1080);
    fsrFramebuffer = createFramebuffer(gl, 5120, 2880);

    setInterval(render, 1000 / 120);

    overlay.createOverlay();
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'O') {
            overlay.toggleOverlay();
        }
    });
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

function createTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}

function createFramebuffer(gl, width, height) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    const texture = createTexture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return { framebuffer, texture };
}

function render() {
    fitCanvasToContainer();

    // Swap textures
    [prevFrameTexture, currFrameTexture] = [currFrameTexture, prevFrameTexture];

    // Upload the current video frame to the current texture
    gl.bindTexture(gl.TEXTURE_2D, currFrameTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);

    // 1. Interpolation Pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, interpolationFramebuffer.framebuffer);
    gl.viewport(0, 0, 1920, 1080);
    gl.useProgram(interpolationProgram);
    gl.uniform1i(gl.getUniformLocation(interpolationProgram, "u_prevFrame"), 0);
    gl.uniform1i(gl.getUniformLocation(interpolationProgram, "u_currFrame"), 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, prevFrameTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, currFrameTexture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 2. FSR Pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, fsrFramebuffer.framebuffer);
    gl.viewport(0, 0, 5120, 2880);
    gl.useProgram(fsrProgram);
    gl.uniform1i(gl.getUniformLocation(fsrProgram, "u_inputTexture"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, interpolationFramebuffer.texture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 3. Final Blit to Canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fsrFramebuffer.framebuffer);
    gl.blitFramebuffer(
        0, 0, 5120, 2880,
        0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight,
        gl.COLOR_BUFFER_BIT, gl.NEAREST
    );

    const stats = {
        sourceFps: 60,
        interpolatedFps: 120,
        ping: 25,
        bitrate: 50
    };
    overlay.updateOverlay(stats);
}

function fitCanvasToContainer() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

window.addEventListener('resize', fitCanvasToContainer);
fitCanvasToContainer();

main();
