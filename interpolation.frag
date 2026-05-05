#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_prevFrame;
uniform sampler2D u_currFrame;
uniform float u_interpolation;

void main() {
  vec4 prev = texture(u_prevFrame, v_texCoord);
  vec4 curr = texture(u_currFrame, v_texCoord);

  // Simple linear interpolation
  outColor = mix(prev, curr, u_interpolation);
}
