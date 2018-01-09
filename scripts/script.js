// Global variable definitionvar canvas;
var canvas;
var gl;
var shaderProgram;

// Buffers
var worldVertexPositionBuffer = null;
var worldVertexTextureCoordBuffer = null;

// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();


// Variable that stores  loading state of textures.
var texturesLoaded = false;

// Keyboard handling helper variable for reading the status of keys
var currentlyPressedKeys = {};

// Variables for storing current position and speed
var pitch = 0;
var pitchRate = 0;
var yaw = 0;
var yawRate = 0;
var xPosition = 0;
var yPosition = 0.5;
var zPosition = 0;
var speed = 0;
var horizontalSpeed = 0;
var flying = 0;

var objectTexture = 1;
var worldTexture = 0;

var lastMouseX = null;
var lastMouseY = null;
var mouseDown = false;
// Helper variable for animation
var lastTime = 0;


var htmlX;
var htmlY;
var htmlZ;
var htmlYaw;
var htmlPitch;


// new objects will be stored in newObjects array.
// items are dictionary id, vertices, xyz
var newObjects = [];
var newObjestCount = 0;

//
// Matrix utility functions
//
// mvPush   ... push current matrix on matrix stack
// mvPop    ... pop top matrix from stack
// degToRad ... convert degrees to radians
//
function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length === 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

//
// initGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initGL(canvas) {
    var gl = null;
    try {
        // Try to grab the standard context. If it fails, fallback to experimental.
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch(e) {}

    // If we don't have a GL context, give up now
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
    return gl;
}

//
// getShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function getShader(gl, id) {
    var shaderScript = document.getElementById(id);

    // Didn't find an element with the specified ID; abort.
    if (!shaderScript) {
        return null;
    }

    // Walk through the source element's children, building the
    // shader source string.
    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType === 3) {
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    // Now figure out what type of shader script we have,
    // based on its MIME type.
    var shader;
    if (shaderScript.type === "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type === "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;  // Unknown shader type
    }

    // Send the source to the shader object
    gl.shaderSource(shader, shaderSource);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    // Create the shader program
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program.");
    }

    // start using shading program for rendering
    gl.useProgram(shaderProgram);

    // store location of aVertexPosition variable defined in shader
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");

    // turn on vertex position attribute at specified position
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    // store location of aVertexNormal variable defined in shader
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");

    // store location of aTextureCoord variable defined in shader
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    // store location of uPMatrix variable defined in shader - projection matrix
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    // store location of uMVMatrix variable defined in shader - model-view matrix
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    // store location of uSampler variable defined in shader
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

//
// setMatrixUniforms
//
// Set the uniforms in shaders.
//
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//
// initTextures
//
// Initialize the textures we'll be using, then initiate a load of
// the texture images. The handleTextureLoaded() callback will finish
// the job; it gets called each time a texture finishes loading.
//

var texturesArray;
function initTextures() {
    texturesArray = [false, false, false, false, false, false, false, false, false, false, false, false, false, false];

    var grass = gl.createTexture();
    grass.image = new Image();
    grass.image.onload = function () {
        handleTextureLoaded(grass);
        texturesArray[0] = grass;
    };
    grass.image.src = "assets/textures/1grass.jpg";

	var wall1 = gl.createTexture();
    wall1.image = new Image();
    wall1.image.onload = function () {
        handleTextureLoaded(wall1);
        texturesArray[1] = wall1;
    };
    wall1.image.src = "assets/textures/2wall.jpg";
	
    var wall2 = gl.createTexture();
    wall2.image = new Image();
    wall2.image.onload = function () {
        handleTextureLoaded(wall2);
        texturesArray[2] = wall2;
    };
    wall2.image.src = "assets/textures/3wall.jpg";

    var wood1 = gl.createTexture();
    wood1.image = new Image();
    wood1.image.onload = function () {
        handleTextureLoaded(wood1);
        texturesArray[3] = wood1;
    };
    wood1.image.src = "assets/textures/4wood.jpg";

    var wood2 = gl.createTexture();
    wood2.image = new Image();
    wood2.image.onload = function () {
        handleTextureLoaded(wood2);
        texturesArray[4] = wood2;
    };
    wood2.image.src = "assets/textures/5wood.jpg";

	var crate = gl.createTexture();
    crate.image = new Image();
    crate.image.onload = function () {
        handleTextureLoaded(crate);
        texturesArray[5] = crate;
    };
    crate.image.src = "assets/textures/6crate.jpg";
	
	var glass = gl.createTexture();
    glass.image = new Image();
    glass.image.onload = function () {
        handleTextureLoaded(glass);
        texturesArray[6] = glass;
    };
    glass.image.src = "assets/textures/7glass.jpg";
	
	var sand = gl.createTexture();
    sand.image = new Image();
    sand.image.onload = function () {
        handleTextureLoaded(sand);
        texturesArray[7] = sand;
    };
    sand.image.src = "assets/textures/8sand.jpg";
	
	var concrete = gl.createTexture();
    concrete.image = new Image();
    concrete.image.onload = function () {
        handleTextureLoaded(concrete);
        texturesArray[8] = concrete;
    };
    concrete.image.src = "assets/textures/9concrete.jpg";
	
	var cardboard = gl.createTexture();
    cardboard.image = new Image();
    cardboard.image.onload = function () {
        handleTextureLoaded(cardboard);
        texturesArray[9] = cardboard;
    };
    cardboard.image.src = "assets/textures/10cardboard.jpg";
	
	var pavement = gl.createTexture();
    pavement.image = new Image();
    pavement.image.onload = function () {
        handleTextureLoaded(pavement);
        texturesArray[10] = pavement;
    };
    pavement.image.src = "assets/textures/11pavement.jpg";
	
	var asphalt = gl.createTexture();
    asphalt.image = new Image();
    asphalt.image.onload = function () {
        handleTextureLoaded(asphalt);
        texturesArray[11] = asphalt;
    };
    asphalt.image.src = "assets/textures/12asphalt.jpg";
		
	var window1= gl.createTexture();
    window1.image = new Image();
    window1.image.onload = function () {
        handleTextureLoaded(window1);
        texturesArray[12] = window1;
    };
    window1.image.src = "assets/textures/13window.jpg";
		
	var ara = gl.createTexture();
    ara.image = new Image();
    ara.image.onload = function () {
        handleTextureLoaded(ara);
        texturesArray[13] = ara;
    };
    ara.image.src = "assets/textures/14ara.jpg";
	
    checkTextures();
}

function checkTextures() {
    var done = true;
    for (var texture of texturesArray) {
        if (texture === false) {
            done = false;
            break;
        }
    }
    if (done) {
        texturesLoaded = true;
    } else {
        setTimeout(checkTextures, 100);
    }
}

function handleTextureLoaded(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Third texture uses Linear interpolation approximation with nearest Mipmap selection
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);

}

//
// handleLoadedWorld
//
// Initialisation of world
//
function handleLoadedWorld(data) {
    var lines = data.split("\n");
    var vertexCount = 0;
    var vertexPositions = [];
    var vertexTextureCoords = [];
    for (var i in lines) {
        var vals = lines[i].replace(/^\s+/, "").split(/\s+/);
        if (vals.length === 6 && vals[5] === "") { // parser quickfix
            vals.pop();
        }

        if (vals.length === 5 && vals[0] !== "//") {
            // It is a line describing a vertex; get X, Y and Z first
            vertexPositions.push(parseFloat(vals[0]));
            vertexPositions.push(parseFloat(vals[1]));
            vertexPositions.push(parseFloat(vals[2]));

            // And then the texture coords
            vertexTextureCoords.push(parseFloat(vals[3]));
            vertexTextureCoords.push(parseFloat(vals[4]));

            vertexCount += 1;
        }
    }

    worldVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    worldVertexPositionBuffer.itemSize = 3;
    worldVertexPositionBuffer.numItems = vertexCount;

    worldVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
    worldVertexTextureCoordBuffer.itemSize = 2;
    worldVertexTextureCoordBuffer.numItems = vertexCount;

}

//
// loadWorld
//
// Loading world
//
function loadWorld() {
    var request = new XMLHttpRequest();
    request.open("GET", "assets/world.txt");
    request.onreadystatechange = function () {
        if (request.readyState === 4) {
            handleLoadedWorld(request.responseText);
        }
    };
    request.send();
}

//
// drawScene
//
// Draw the scene.
//
function drawScene() {
    // set the rendering environment to full canvas size
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // If buffers are empty we stop loading the application.
    if (worldVertexTextureCoordBuffer == null || worldVertexPositionBuffer == null) {
        return;
    }

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    mat4.identity(mvMatrix);

    mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
    //rotateView(mvMatrix);

    mat4.translate(mvMatrix, [-xPosition, -yPosition, -zPosition]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texturesArray[worldTexture%texturesArray.length]);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, worldVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, worldVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, worldVertexPositionBuffer.numItems);

    ////////////////////////////////////////////////////////////////////////

    if (currentObjectVertices) {
        drawInSelection(currentObjectVertices);
    }
    mat4.identity(mvMatrix);

    mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
    //rotateView(mvMatrix);

    mat4.translate(mvMatrix, [-xPosition, -yPosition, -zPosition]);


    setMatrixUniforms();
    for (var i = 0; i < newObjects.length; i++) {
        drawObject(newObjects[i]);
    }

    xyzCalculated = false;

}

function drawObject(obj) {
    var verticesBuffer = obj.verticesBuffer;
    var texture = obj.texture;
    var textureCoordinatesBuffer = obj.textureCoordinatesBuffer;
    var vertexIndicesBuffer = obj.vertexIndicesBuffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, verticesBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinatesBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, textureCoordinatesBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndicesBuffer);
    gl.drawElements(gl.TRIANGLES, vertexIndicesBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}
var mouseMoveX = 0;
var mouseMoveY = 0;
var xyzCalculated = false;
var dx;
var dz;
var dy;
function rotateView(matrix) {
    if (!xyzCalculated) {
        xyzCalculated = true;
        dx = Math.sin(degToRad(yaw)) * inSelectionObjectDepth * Math.cos(degToRad(pitch));
        dz = Math.cos(degToRad(yaw)) * inSelectionObjectDepth * Math.cos(degToRad(pitch));
        dy = Math.sin(degToRad(pitch)) * inSelectionObjectDepth;
    }
    mat4.translate(matrix, [-dx ,-dy, -dz]);
    mat4.rotate(matrix, degToRad(mouseMoveY), [1, 0, 0]);
    mat4.rotate(matrix, degToRad(mouseMoveX), [0, 1, 0]);
    mat4.translate(matrix, [dx ,dy, dz]);
}

var currentObjectVertices = [
    // Front face
    -1.0, -1.0,  1.0,
    1.0, -1.0,  1.0,
    1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
    1.0,  1.0,  1.0,
    1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
    1.0, -1.0, -1.0,
    1.0,  1.0, -1.0,
    1.0,  1.0,  1.0,
    1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
];

var currentObjectTextureCoordinates = [
    // Front
    1.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Back
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Top
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Bottom
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Right
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Left
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0
];

var currentObjectIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
];

var currentObjectTexture;

var rotatorX = 0;
var rotatorY = 0;
var rotatorZ = 0;
var inSelectionObjectDepth = 4;
var inSelectionObjectHeight = 0;
var inSelectionObjectScale = 0.5;
function drawInSelection(vert) {

    var vertices = new Float32Array(vert);
    var vertexPositionBuffer = gl.createBuffer();

    // Select the vertexPositionBuffer as the one to apply vertex
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    mat4.identity(mvMatrix);


    var matrika = new Float32Array(16);
    mat4.identity(matrika);
    mat4.rotate(matrika, degToRad(-rotatorX), [1, 0, 0]);
    mat4.rotate(matrika, degToRad(-rotatorY), [0, 1, 0]);
    mat4.rotate(matrika, degToRad(-rotatorZ), [0, 0, 1]);

    mat4.scale(matrika, [inSelectionObjectScale, inSelectionObjectScale, inSelectionObjectScale]);


    var vertx = multiplyMVr(matrika, vertices);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertx), gl.STATIC_DRAW);
    vertexPositionBuffer.itemSize = 3;
    vertexPositionBuffer.numItems = vertices.length / 3;

    // TODO textures

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    var vertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTextureCoordBuffer);

    // Pass the texture coordinates into WebGL
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(currentObjectTextureCoordinates), gl.STATIC_DRAW);
    vertexTextureCoordBuffer.itemSize = 2;
    vertexTextureCoordBuffer.numItems = currentObjectTextureCoordinates.length / vertexTextureCoordBuffer.itemSize;

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texturesArray[objectTexture%texturesArray.length]);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    var VertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VertexIndexBuffer);

    // Now send the element array to GL
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(currentObjectIndices), gl.STATIC_DRAW);
    VertexIndexBuffer.itemSize = 1;
    VertexIndexBuffer.numItems = currentObjectIndices.length;


    // Draw the cube.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VertexIndexBuffer);
    mat4.translate(mvMatrix, [0, -inSelectionObjectHeight, -inSelectionObjectDepth]);

    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, VertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

}

function newObject() {
    var x, y, z, dx, dy, dz;

    dx = Math.sin(degToRad(yaw)) * inSelectionObjectDepth * Math.cos(degToRad(pitch));
    dz = Math.cos(degToRad(yaw)) * inSelectionObjectDepth * Math.cos(degToRad(pitch));
    dy = Math.sin(degToRad(pitch)) * inSelectionObjectDepth;

    x = xPosition - dx;
    z = zPosition - dz;
    y = yPosition - inSelectionObjectHeight + dy;

    var vertices = new Float32Array(currentObjectVertices);

    var matrix = mat4.identity(new Float32Array(16));
    mat4.rotate(matrix, degToRad(yaw), [0, 1, 0]);
    mat4.rotate(matrix, degToRad(pitch), [1, 0, 0]);

    mat4.rotate(matrix, degToRad(-rotatorX), [1, 0, 0]);
    mat4.rotate(matrix, degToRad(-rotatorY), [0, 1, 0]);
    mat4.rotate(matrix, degToRad(-rotatorZ), [0, 0, 1]);

    mat4.scale(matrix, [inSelectionObjectScale, inSelectionObjectScale, inSelectionObjectScale]);

    var newVertices = multiplyMVr(matrix, vertices);
    // but it works :')
    for ( var i = 2; i < newVertices.length; i += 3) { // depth
        newVertices[i] += z;
    }
    for ( var i = 1; i < newVertices.length; i += 3) { // height
        newVertices[i] += y;
    }
    for ( var i = 0; i < newVertices.length; i += 3) { // left/right
        newVertices[i] += x;
    }

    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(newVertices), gl.STATIC_DRAW);
    vertexBuffer.itemSize = 3;
    vertexBuffer.numItems = newVertices.length / 3;

    var textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(currentObjectTextureCoordinates), gl.STATIC_DRAW);
    textureBuffer.itemSize = 2;
    textureBuffer.numItems = currentObjectTextureCoordinates.length / textureBuffer.itemSize;

    var VertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, VertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(currentObjectIndices), gl.STATIC_DRAW);
    VertexIndexBuffer.itemSize = 1;
    VertexIndexBuffer.numItems = currentObjectIndices.length;

    newObjects.push({"vertexIndicesBuffer":VertexIndexBuffer, "textureCoordinatesBuffer":textureBuffer, "verticesBuffer":vertexBuffer, "vertices":newVertices, "vertexIndices": currentObjectIndices, "texture":texturesArray[objectTexture%texturesArray.length], "textureCoordinates":currentObjectTextureCoordinates, "id": newObjestCount++, "xyz":[x, y, z]});

}

function multiplyMVr(matrix, vertices) {
    var newone = [];
    for ( var i = 0; i < vertices.length; i += 3) {
        var xyz = multiplyMV(matrix, [vertices[i], vertices[i + 1], vertices[i + 2]]);
        newone.push(xyz[0]);
        newone.push(xyz[1]);
        newone.push(xyz[2]);
    }
    return newone;
}

function multiplyMV(matrix, vector) {
    if (vector.length === 3) {
        vector.push(1);
    }
    var xyzn = new Float32Array(vector.length);
    for (var i = 0; i < vector.length; i++) {
        xyzn[i] = 0;
        for (var j = 0; j < vector.length; j++) {
            var m = matrix[i + 4 * j];
            var n = vector[j%4];
            xyzn[i] += m * n
        }
    }
    var normal = xyzn[3];
    if (normal !== 1) {
        xyzn[0] = xyzn[0] / normal;
        xyzn[1] = xyzn[1] / normal;
        xyzn[2] = xyzn[2] / normal;
    }
    return [xyzn[0], xyzn[1], xyzn[2]];
}

//
// animate
//
// Called every time before redrawing the screen.
//
function animate() {
    var timeNow = new Date().getTime();
    if (lastTime !== 0) {
        var elapsed = timeNow - lastTime;

        if (speed !== 0) {
            xPosition -= Math.sin(degToRad(yaw)) * speed * elapsed;
            zPosition -= Math.cos(degToRad(yaw)) * speed * elapsed;
        }

        if (horizontalSpeed !== 0) {
            xPosition -= Math.sin(degToRad(yaw + 90)) * horizontalSpeed * elapsed;
            zPosition -= Math.cos(degToRad(yaw + 90)) * horizontalSpeed * elapsed;
        }

        if (yPosition >= 0.5){
            yPosition += flying * elapsed / 20 * 0.5;
        }

        yaw += yawRate * elapsed;
        pitch += pitchRate * elapsed;

    }
    lastTime = timeNow;
}

//
// Keyboard handling helper functions
//
// handleKeyDown    ... called on keyDown event
// handleKeyUp      ... called on keyUp event
//
function handleKeyDown(event) {
    // storing the pressed state for individual key
    console.log(event.keyCode);

    if (event.keyCode === 13) {
        if (! currentlyPressedKeys[event.keyCode]) {
            newObject();
        }
    }

    currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
    // reseting the pressed state for individual key
    currentlyPressedKeys[event.keyCode] = false;
}

//
// handleKeys
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//
function handleKeys() {
    if (currentlyPressedKeys[33]) {
        // Page Up
        pitchRate = 0.1;
    } else if (currentlyPressedKeys[34]) {
        // Page Down
        pitchRate = -0.1;
    } else {
        pitchRate = 0;
    }

    if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
        // Left cursor key or A
        horizontalSpeed = 0.003;
    } else if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
        // Right cursor key or D
        horizontalSpeed = -0.003;
    } else {
        horizontalSpeed = 0;
    }

    // Spacebar
    if (currentlyPressedKeys[32]){
        flying = 0.05;
    }
    //Ctrl
    else if (currentlyPressedKeys[67]){
        if (yPosition < 0.5){
            flying = -0.000000000000000000000000005;
        }
        else{
            flying = -0.05
        }
    }
    else {
        flying = 0;
    }

    if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
        // Up cursor key or W
        speed = 0.003;
        //shift
        if (currentlyPressedKeys[16]){
            speed = 0.008;
        }
    } else if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
        // Down cursor key
        speed = -0.003;
        //shift
        if (currentlyPressedKeys[16]){
            speed = -0.008;
        }
    } else {
        speed = 0;
    }


    if (currentlyPressedKeys[77]) {
        // k
        inSelectionObjectHeight += 0.01;
    } else if (currentlyPressedKeys[75]) {
        // m
        inSelectionObjectHeight += -0.01;
    }

    if (currentlyPressedKeys[78]) {
        // j
        inSelectionObjectDepth -= 0.01;
    } else if (currentlyPressedKeys[74]) {
        // n
        inSelectionObjectDepth += 0.01;
    }

    if (currentlyPressedKeys[72]) {
        // h
        inSelectionObjectScale += 0.01;
    } else if (currentlyPressedKeys[66]) {
        // b
        inSelectionObjectScale -= 0.01;
    }

    var rotationfactor = 0.2;
    if (currentlyPressedKeys[16]) { // shift
        rotationfactor = 0.6
    }

    if (currentlyPressedKeys[82]) {
        // r
        rotatorX += rotationfactor;
    } else if (currentlyPressedKeys[84]) {
        // t
        rotatorX -= rotationfactor;
    }

    if (currentlyPressedKeys[90]) {
        // z
        rotatorY += rotationfactor;
    } else if (currentlyPressedKeys[85]) {
        // u
        rotatorY -= rotationfactor;
    }

    if (currentlyPressedKeys[73]) {
        // i
        rotatorZ += rotationfactor;
    } else if (currentlyPressedKeys[79]) {
        // o
        rotatorZ -= rotationfactor;
    }


}


//
// start
//
// Called when the canvas is created to get the ball rolling.
// Figuratively, that is. There's nothing moving in this demo.
//
function start() {
    canvas = document.getElementById("glcanvas");

    gl = initGL(canvas);      // Initialize the GL context

    // Only continue if WebGL is available and working
    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
        gl.clearDepth(1.0);                                     // Clear everything
        gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
        gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things

		//hiding the potential object from the beginning
		currentObjectVertices = false;
		
        //variable for checking if buttons are visible or not
        var hud = false;

        //disabling default right click event on canvas
        canvas.oncontextmenu = function (e) {
            e.preventDefault();
        };

        document.onmousemove = function (ev) {
            if (!mouseDown) {
                return;
            }
            var newX = event.clientX;
            var newY = event.clientY;

            if (currentlyPressedKeys[17]) { // ctrl
                rotatorY -= (newX - lastMouseX) * 0.1;
                rotatorX -= (newY - lastMouseY) * 0.1;
            } else if (currentlyPressedKeys[81]) { // q
                //yaw = 0;
                //pitch = 0;
                mouseMoveX += (newX - lastMouseX) * 0.1;
                mouseMoveY += (newY - lastMouseY) * 0.1;
            } else {
                //mouseMoveX = 0;
                //mouseMoveY = 0;
                yaw += (newX - lastMouseX) * 0.1;
                pitch += (newY - lastMouseY) * 0.1;
            }
            lastMouseX = newX;
            lastMouseY = newY;
        };

        document.onmouseup = function (ev) {
            mouseDown = false;
        };

        //right click event	- hide or show buttons
        canvas.onmousedown = function(e){

            if (e.which === 3){
                if (hud === true){
                    for (var i = 1; i < 10; i++) {
                        document.getElementById("button"+i).style.visibility="hidden";
                    }
                    document.getElementById("hudBG").style.visibility="hidden";
					document.getElementById("cancelSelection").style.visibility="hidden";
                    document.getElementById("changeObjectTexture").style.visibility="hidden";
                    document.getElementById("changeWorldTexture").style.visibility="hidden";
                    hud = false;
                }
                else {
                    for (var i = 1; i < 10; i++) {
                        document.getElementById("button"+i).style.visibility="visible";
                    }
                    document.getElementById("hudBG").style.visibility="visible";
					document.getElementById("cancelSelection").style.visibility="visible";
                    document.getElementById("changeObjectTexture").style.visibility="visible";
                    document.getElementById("changeWorldTexture").style.visibility="visible";
                    hud = true;
                }
            } else if (e.which === 1) {
                mouseDown = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        };

        // Initialize the shaders; this is where all the lighting for the
        // vertices and so forth is established.
        initShaders();

        // Next, load and set up the textures we'll be using.
        initTextures();

        // Initialise world objects
        loadWorld();

        // Bind keyboard handling functions to document handlers
        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;

        // Set up to draw the scene periodically.
        setInterval(function() {
            if (texturesLoaded) { // only draw scene and animate when textures are loaded.
                requestAnimationFrame(animate);
                handleKeys();
                drawScene();
            }
        }, 15);

        document.getElementById("button1").onclick = function() { // square
            currentObjectVertices = [
                // Front face
                -0.4, -0.4, 0.0,
                0.8, -0.4,  0.0,
                0.8,  0.8,  0.0,
                -0.4,  0.8,  0.0,

            ];

            currentObjectTextureCoordinates = [
                // Front
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,

            ];

            currentObjectIndices = [
                0,  1,  2,      0,  2,  3,    // front
            ];
        };

        document.getElementById("button2").onclick = function() { // triangle
            currentObjectVertices = [
                // Front face
                -1.0, 0.0, 0.0,
                1.0, 0.0,  0.0,
                0.0, 1.4,  0.0
            ];

            currentObjectTextureCoordinates = [
                // Front
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0
            ];

            currentObjectIndices = [
                0,  1,  2,     // front
            ];
        };

        document.getElementById("button3").onclick = function() { // triangle
            currentObjectVertices = [0,0,0];
            currentObjectIndices = [];
            currentObjectTextureCoordinates = [0.5,0.5];
            var smoothness = 120;
            for (var i = 0; i <= smoothness + 2; i++){
                var x = Math.cos(i*2*Math.PI/smoothness);
                var y = Math.sin(i*2*Math.PI/smoothness);
                currentObjectVertices.push(x);
                currentObjectVertices.push(y);
                currentObjectVertices.push(0);

                currentObjectTextureCoordinates.push((x + 1) / 2);
                currentObjectTextureCoordinates.push((y + 1) / 2);
                currentObjectIndices.push(0);
                currentObjectIndices.push(i);
                currentObjectIndices.push(i + 1);
            }
            currentObjectIndices.pop();

        };

        document.getElementById("button4").onclick = function() { // panel
            currentObjectVertices = [
                // Front face
                -1.0, -1.0, -0.9,
                1.0, -1.0,  -0.9,
                1.0,  1.0,  -0.9,
                -1.0,  1.0, -0.9,

                // Back face
                1.0, -1.0, -1.0,
                -1.0, -1.0, -1.0,
                -1.0,  1.0, -1.0,
                1.0,  1.0, -1.0,

                // Top face
                -1.0,  1.0, -1.0,
                -1.0,  1.0,  -0.9,
                1.0,  1.0,  -0.9,
                1.0,  1.0, -1.0,

                // Bottom face
                -1.0, -1.0, -1.0,
                1.0, -1.0, -1.0,
                1.0, -1.0,  -0.9,
                -1.0, -1.0, -0.9,

                // Right face
                1.0, -1.0, -0.9,
                1.0, -1.0, -1.0,
                1.0,  1.0, -1.0,
                1.0,  1.0, -0.9,


                // Left face
                -1.0, -1.0, -1.0,
                -1.0, -1.0, -0.9,
                -1.0,  1.0, -0.9,
                -1.0,  1.0, -1.0
            ];

            currentObjectTextureCoordinates = [
                // Front
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Back
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Top
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Bottom
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Right
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Left
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0
            ];

            currentObjectIndices = [
                0,  1,  2,      0,  2,  3,    // front
                4,  5,  6,      4,  6,  7,    // back
                8,  9,  10,     8,  10, 11,   // top
                12, 13, 14,     12, 14, 15,   // bottom
                16, 17, 18,     16, 18, 19,   // right
                20, 21, 22,     20, 22, 23    // left
            ];
        };

        document.getElementById("button5").onclick = function() { // cube
            currentObjectVertices = [
                // Front face
                -1.0, -1.0,  1.0,
                1.0, -1.0,  1.0,
                1.0,  1.0,  1.0,
                -1.0,  1.0,  1.0,

                // Back face
                1.0, -1.0, -1.0,
                -1.0, -1.0, -1.0,
                -1.0,  1.0, -1.0,
                1.0,  1.0, -1.0,

                // Top face
                -1.0,  1.0, -1.0,
                -1.0,  1.0,  1.0,
                1.0,  1.0,  1.0,
                1.0,  1.0, -1.0,

                // Bottom face
                -1.0, -1.0, -1.0,
                1.0, -1.0, -1.0,
                1.0, -1.0,  1.0,
                -1.0, -1.0,  1.0,

                // Right face
                1.0, -1.0,  1.0,
                1.0, -1.0, -1.0,
                1.0,  1.0, -1.0,
                1.0,  1.0,  1.0,


                // Left face
                -1.0, -1.0, -1.0,
                -1.0, -1.0,  1.0,
                -1.0,  1.0,  1.0,
                -1.0,  1.0, -1.0
            ];

            currentObjectTextureCoordinates = [
                // Front
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Back
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Top
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Bottom
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Right
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // Left
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0
            ];

            currentObjectIndices = [
                0,  1,  2,      0,  2,  3,    // front
                4,  5,  6,      4,  6,  7,    // back
                8,  9,  10,     8,  10, 11,   // top
                12, 13, 14,     12, 14, 15,   // bottom
                16, 17, 18,     16, 18, 19,   // right
                20, 21, 22,     20, 22, 23    // left
            ];
        };

        document.getElementById("button6").onclick = function() { // pyramid
            currentObjectVertices = [
                // Front face
                0.0, 1.0, 0,
                -1.0, -1.0,  1.0,
                1.0, -1.0, 1.0,
                // left face
                0.0, 1.0, 0,
                -1.0, -1.0,  1.0,
                -1.0, -1.0, -1.0,
                // back face
                0.0, 1.0, 0,
                -1.0, -1.0, -1.0,
                1.0, -1.0,  -1.0,
                // right face
                0.0, 1.0, 0,
                1.0, -1.0, -1.0,
                1.0, -1.0, 1.0,
                // bottom faces
                1.0, -1.0,  1.0,
                1.0, -1.0, -1.0,
                -1.0, -1.0, -1.0,
                1.0, -1.0,  1.0,
                -1.0, -1.0, 1.0,
                -1.0, -1.0, -1.0,
            ];

            currentObjectTextureCoordinates = [
                // Front
                0.5, 1,
                1,  0,
                0.0,  0.0,
                0.5, 1,
                1,  0,
                0.0,  0.0,
                0.5, 1,
                1,  0,
                0.0,  0.0,
                0.5, 1,
                1,  0,
                0.0,  0.0,
                // bottom
                1, 1,
                1,  0,
                0,  0,
                1, 1,
                0,  1,
                0,  0,
            ];

            currentObjectIndices = [
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
            ];
        };

        document.getElementById("button7").onclick = function() { //bridge
            currentObjectVertices = [
                -1, 0, 0,
                -1, 0, 1,
                -1, 1, 1,
                -1, 1, 0,

                -1, 1, 0,
                -1, 1, 1,
                1, 1, 1,
                1, 1, 0,

                1, 0, 0,
                1, 0, 1,
                1, 1, 1,
                1, 1, 0,
            ];
            currentObjectTextureCoordinates = [
                // left
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
                // top
                0.0,  0.0,
                1.0,  0.0,
                1.0,  2.0,
                0.0,  2.0,
                // Right
                0.0,  0.0,
                1.0,  0.0,
                1.0,  1.0,
                0.0,  1.0,
            ];

            currentObjectIndices = [
                0,  1,  2,      0,  2,  3,    // front
                4,  5,  6,      4,  6,  7,    // back
                8,  9,  10,     8,  10, 11,   // top
            ];
        };

        document.getElementById("button8").onclick = function() { // triangle
            currentObjectVertices = [0,-1,0];
            currentObjectIndices = [];
            currentObjectTextureCoordinates = [0.5,0.5];

            var smoothness = 120;

            for (var i = 0; i <= smoothness; i++){
                var x = Math.cos(i*2*Math.PI/smoothness);
                var y = Math.sin(i*2*Math.PI/smoothness);
                currentObjectVertices.push(x);
                currentObjectVertices.push(-1);
                currentObjectVertices.push(y);

                currentObjectTextureCoordinates.push((x + 1) / 2);
                currentObjectTextureCoordinates.push((y + 1) / 2);
                currentObjectIndices.push(0);
                currentObjectIndices.push(i);
                currentObjectIndices.push(i + 1);
            }
            currentObjectIndices.pop();
            currentObjectIndices.push(1);

            var indiceIndex = currentObjectVertices.length / 3;
            for (var i = 0; i <= smoothness*2 + 1; i++){
                var x = Math.cos(i*2*Math.PI/smoothness);
                var y = Math.sin(i*2*Math.PI/smoothness);
                currentObjectVertices.push(x);
                currentObjectVertices.push(-1);
                currentObjectVertices.push(y);
                currentObjectVertices.push(x);
                currentObjectVertices.push(1);
                currentObjectVertices.push(y);

                currentObjectTextureCoordinates.push(2*i/smoothness);
                currentObjectTextureCoordinates.push(0);
                currentObjectTextureCoordinates.push(2*i/smoothness);
                currentObjectTextureCoordinates.push(1);
                currentObjectIndices.push(indiceIndex + i);
                currentObjectIndices.push(indiceIndex + i + 1);
                currentObjectIndices.push(indiceIndex + i + 2);

            }
            currentObjectIndices.pop();
            currentObjectIndices.pop();
            currentObjectIndices.pop();


            indiceIndex = currentObjectVertices.length / 3;

            for (var i = 0; i <= smoothness; i++){
                var x = Math.cos(i*2*Math.PI/smoothness);
                var y = Math.sin(i*2*Math.PI/smoothness);
                currentObjectVertices.push(x);
                currentObjectVertices.push(1);
                currentObjectVertices.push(y);

                currentObjectTextureCoordinates.push((x + 1) / 2);
                currentObjectTextureCoordinates.push((y + 1) / 2);
                currentObjectIndices.push(indiceIndex);
                currentObjectIndices.push(indiceIndex + i);
                currentObjectIndices.push(indiceIndex + i + 1);
            }
            currentObjectIndices.pop();
        };

        document.getElementById("button9").onclick = function() { // triangle
            currentObjectVertices = [];
            currentObjectIndices = [];
            currentObjectTextureCoordinates = [];

            var smoothness = 20;

            for (var latNumber = 0; latNumber <= smoothness; latNumber++) {
                var theta = latNumber * Math.PI / smoothness;
                var sinTheta = Math.sin(theta);
                var cosTheta = Math.cos(theta);

                for (var longNumber = 0; longNumber <= smoothness; longNumber++) {
                    var phi = longNumber * 2 * Math.PI / smoothness;
                    var sinPhi = Math.sin(phi);
                    var cosPhi = Math.cos(phi);

                    var x = cosPhi * sinTheta;
                    var y = cosTheta;
                    var z = sinPhi * sinTheta;
                    var u = 1 - (longNumber / smoothness);
                    var v = 1 - (latNumber / smoothness);

                    currentObjectTextureCoordinates.push(u * 2);
                    currentObjectTextureCoordinates.push(v * 2);
                    currentObjectVertices.push(x);
                    currentObjectVertices.push(y);
                    currentObjectVertices.push(z);

                    if (latNumber !== 0) {
                        currentObjectIndices.push(latNumber * (smoothness + 1) + longNumber);
                        currentObjectIndices.push((latNumber - 1) * (smoothness + 1) + longNumber);
                        currentObjectIndices.push(latNumber * (smoothness + 1) + longNumber + 1);
                        currentObjectIndices.push(latNumber * (smoothness + 1) + longNumber + 1);
                        currentObjectIndices.push((latNumber - 1) * (smoothness + 1) + longNumber);
                        currentObjectIndices.push((latNumber - 1) * (smoothness + 1) + longNumber + 1);
                    }
                }
            }
            currentObjectIndices.pop();
            currentObjectIndices.pop();
            currentObjectIndices.pop();
            currentObjectIndices.pop();
            currentObjectIndices.pop();
            currentObjectIndices.pop();
        };


        document.getElementById("cancelSelection").onclick = function() {
            currentObjectVertices = false;
        };


        htmlX = document.getElementById("xCoor");
        htmlX.onchange = function(event) {
            xPosition = parseFloat(htmlX.value);
        };

        htmlY = document.getElementById("yCoor");
        htmlY.onchange = function(event) {
            yPosition = parseFloat(htmlY.value);
        };

        htmlZ = document.getElementById("zCoor");
        htmlZ.onchange = function(event) {
            zPosition = parseFloat(htmlZ.value);
        };

        htmlYaw = document.getElementById("yaw");
        htmlYaw.onchange = function(event) {
            yaw = parseFloat(htmlYaw.value);
        };

        htmlPitch = document.getElementById("pitch");
        htmlPitch.onchange = function(event) {
            yaw = parseFloat(htmlPitch.value);
        };

        document.getElementById("xMinus").onclick = function(event) {
            xPosition -= 1;
        };

        document.getElementById("xPlus").onclick = function(event) {
            xPosition += 1;
        };

        document.getElementById("yMinus").onclick = function(event) {
            yPosition -= 1;
        };

        document.getElementById("yPlus").onclick = function(event) {
            yPosition += 1;
        };

        document.getElementById("zMinus").onclick = function(event) {
            zPosition -= 1;
        };

        document.getElementById("zPlus").onclick = function(event) {
            zPosition += 1;
        };

        document.getElementById("yawMinus").onclick = function(event) {
            yaw -= 1;
        };

        document.getElementById("yawPlus").onclick = function(event) {
            yaw += 1;
        };

        document.getElementById("pitchMinus").onclick = function(event) {
            pitch -= 1;
        };

        document.getElementById("pitchPlus").onclick = function(event) {
            pitch += 1;
        };

        var positiveDegrees = function(d) {
            while (d < 0) {
                d += 360;
            }
            return d % 360;
        };

        var numOfChars = 7;

        setInterval(function() {
            if (document.activeElement !== htmlPitch) {
                htmlPitch.value = positiveDegrees(pitch).toString().slice(0, numOfChars);
            }
            if (document.activeElement !== htmlYaw) {
                htmlYaw.value = positiveDegrees(yaw).toString().slice(0, numOfChars);
            }
            if (document.activeElement !== htmlX) {
                htmlX.value = xPosition.toString().slice(0, numOfChars);
            }
            if (document.activeElement !== htmlY) {
                htmlY.value = yPosition.toString().slice(0, numOfChars);
            }
            if (document.activeElement !== htmlZ) {
                htmlZ.value = zPosition.toString().slice(0, numOfChars);
            }
        },
            250);

        document.getElementById("changeObjectTexture").onclick = function(event) {
            objectTexture++; 
        };
        document.getElementById("changeWorldTexture").onclick = function(event) {
            worldTexture++;
        };
    }
}

