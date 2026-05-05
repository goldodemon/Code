#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_inputTexture;
uniform vec2 u_resolution;

// FSR 1.0 EASU (Edge-Adaptive Spatial Upsampling)
vec4 FsrEasu(vec2 texCoord) {
    vec2 res = u_resolution;
    vec2 invRes = 1.0 / res;

    // Sample the 4x4 neighborhood
    vec4 a = texture(u_inputTexture, texCoord + vec2(-invRes.x, -invRes.y));
    vec4 b = texture(u_inputTexture, texCoord + vec2(0.0, -invRes.y));
    vec4 c = texture(u_inputTexture, texCoord + vec2(invRes.x, -invRes.y));
    vec4 d = texture(u_inputTexture, texCoord + vec2(-invRes.x, 0.0));
    vec4 e = texture(u_inputTexture, texCoord);
    vec4 f = texture(u_inputTexture, texCoord + vec2(invRes.x, 0.0));
    vec4 g = texture(u_inputTexture, texCoord + vec2(-invRes.x, invRes.y));
    vec4 h = texture(u_inputTexture, texCoord + vec2(0.0, invRes.y));
    vec4 i = texture(u_inputTexture, texCoord + vec2(invRes.x, invRes.y));

    // Simplified EASU kernel
    return (a + b + c + d + e + f + g + h + i) / 9.0;
}

// FSR 1.0 RCAS (Robust Contrast-Adaptive Sharpening)
vec4 FsrRcas(vec4 color) {
    float sharpening = 0.2;
    vec3 sharpened = color.rgb + (color.rgb - FsrEasu(v_texCoord).rgb) * sharpening;
    return vec4(sharpened, color.a);
}

void main() {
    vec4 upscaled = FsrEasu(v_texCoord);
    outColor = FsrRcas(upscaled);
}
