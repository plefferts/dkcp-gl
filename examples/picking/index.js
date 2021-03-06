var m4                = require('../../lib/twgl').m4
var DkcpGl            = require('../../src/dkcp-gl')
var picking           = require('../../src/picking')

var Renderable        = DkcpGl.Renderable
var Model             = DkcpGl.Model
var Plate             = DkcpGl.Plate
var Shader            = DkcpGl.Shader
var Allocation        = DkcpGl.Allocation
var MouseTrack        = DkcpGl.MouseTrack

var main = new DkcpGl({
  canvas : document.getElementById('canvas'),
  frameRate : {
    element : document.getElementById('framerate')
  },
  wasd : {
    document : document,
    delta : .05,
    theta : -Math.PI / 120
  }
})
var camera = main.camera;
var screen = main.screen;
var gl     = main.screen.gl;

var hitTestManager = new picking.HitTestManager(gl, 100);

function getRenderable() {
  return new Renderable({
    renderOrder : 10,
    getUniforms : function (uniforms, renderSet) {
      uniforms.camera = camera.computeMatrix()
      return uniforms
    },
    factory : function () {
      
      var maxColors = 100
      var colorAllocation    = new Allocation.Float(maxColors, 4)
      
      var shader = new picking.HitTestShader(hitTestManager.hitColorAllocation, function (hit_test) {
        var hit_test_zoom_matrix = hit_test ? 'hit_test_zoom_matrix * ' : '';

        return '  gl_Position = ' + hit_test_zoom_matrix + 'camera * position; \n' + 
               '  f_color = colors[int(color)];              \n'
      }, function () {
        return '  gl_FragColor = f_color; \n'
      })

      shader.attributes.position     = 'vec4';
      shader.attributes.color        = 'float';
      shader.varyings.f_color        = 'vec4';
      shader.vertex_uniforms.camera  = 'mat4';
      shader.vertex_uniforms['colors[' + maxColors + ']'] = 'vec4';

      var m = new Model(this, shader, 100)

      hitTestManager.mixinModel(m)
      
      m.addAttribute('position', 4, 'Float32Array', function (i, item) {
        return item.vertices[i]
      });
      
      m.addAttribute('color', 1, 'Float32Array', function (i, item) {
        return [
          colorAllocation.add(item.color, item, function () {
            return item.color.color
          })
        ]
      });

      m.uniforms.colors = colorAllocation.buffer;
  
      return m
    }
  })
}

var square = function (x, y, z, w) {
  return [
    [x - w,  y - w, z, 1],
    [x - w,  y + w, z, 1],
    [x + w,  y - w, z, 1],
    [x + w,  y + w, z, 1]
  ]
}

var red     = {id: 'red',     color: [1, 0, 0, 1]}
var green   = {id: 'green',   color: [0, 1, 0, 1]}
var blue    = {id: 'blue',    color: [0, 0, 1, 1]}
var white   = {id: 'white',   color: [1, 1, 1, 1]}

screen.addRenderable({
  before : function () {
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  },
  renderOrder : 0
})

var quads  = getRenderable()
screen.addRenderable(quads)
hitTestManager.renderSet.addRenderable(quads);

quads.add({
  color : red,
  hit_area : 'red',
  allocations : {},
  vertices : square(.25, 0, .7, .05)
})
quads.add({
  color : green,
  hit_area : 'green',
  allocations : {},
  vertices : square(0, .25, .7, .05)
})
quads.add({
  color : blue,
  hit_area : 'blue',
  allocations : {},
  vertices : square(0, 0, .9, .05)
})
quads.add({
  color : white,
  hit_area : 'white',
  allocations : {},
  vertices : square(0, 0, .7, .01)
})


  
;(function () {
  
  var shader = new Shader(function () {
    return (
      '  v_pos       = position; \n' +
      '  gl_Position = camera * vec4(position.x / 4.0, position.y / 4.0, 1.5, 1.0); \n'
    ) 
  }, function () {
    return (
      '  gl_FragColor = texture2D(                            \n'+
      '      texture,                                         \n'+
      '      vec2(v_pos.x / 2.0 + 0.5, v_pos.y / 2.0 + 0.5)); \n'
    )
  })
  shader.attributes.position              = 'vec4';
  shader.fragment_uniforms.texture        = 'sampler2D';
  shader.vertex_uniforms.camera           = 'mat4';
  shader.varyings.v_pos                   = 'vec4';
  
  var texture = hitTestManager.renderSet.framebuffers.texture
  var plate = new Plate(shader);
  plate.textureData = {texture : texture}
  plate.add({z: 1})
  
  var uniforms = {};

  screen.addRenderable({
    renderOrder : 30,
    render : function (gl) {
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendEquationSeparate( gl.FUNC_ADD, gl.FUNC_ADD );
      gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA, gl.DST_ALPHA, gl.ONE, gl.ONE);
      uniforms.camera = camera.computeMatrix();
      uniforms.texture = texture.texture;
      var geom = plate.getGeometry(gl);
      plate.drawPrep(geom, uniforms);
      geom.draw();
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
    }
  })

}());

screen.beginFrameRendering(false)

var mouseTrack = new MouseTrack()
mouseTrack.bindMouseEvents(main.screen.canvas, function (x, y) {
  return hitTestManager.test(gl, camera, x, y)
})

screen.on('moved', function () {
  mouseTrack.track() // update mouseover/mouseout when the camera changes
})

mouseTrack.on('mouseover', function (e) {
  console.log('mouseover', e)
})

mouseTrack.on('mouseout', function (e) {
  console.log('mouseout', e)
})

mouseTrack.on('mousedown', function (e) {
  console.log('mousedown', e)
})

mouseTrack.on('mouseup', function (e) {
  console.log('mouseup', e)
})

mouseTrack.on('mousemove', function (e) {
  // console.log('mousemove', e)
})

mouseTrack.on('click', function (e) {
  console.log('click', e)
})
