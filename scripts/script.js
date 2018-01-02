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

// Variables for storing textures
var wallTexture;

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
var yPosition = 0.4;
var zPosition = 0;
var speed = 0;
var flying = 0;

// Helper variable for animation
var lastTime = 0;

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
function initTextures() {
    wallTexture = gl.createTexture();
    wallTexture.image = new Image();
    wallTexture.image.onload = function () {
        handleTextureLoaded(wallTexture)
    };
    wallTexture.image.src = "assets/ara.png";
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

    // when texture loading is finished we can draw scene.
    texturesLoaded = true;
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

    document.getElementById("loadingtext").textContent = "";
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

    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio of 640:480, and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);


    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    mat4.identity(mvMatrix);

    // Now move the drawing position a bit to where we want to start
    // drawing the world.
    mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
    mat4.translate(mvMatrix, [-xPosition, -yPosition, -zPosition]);

    // Activate textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, wallTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, worldVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Draw the world by binding the array buffer to the world's vertices
    // array, setting attributes, and pushing it to GL.
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, worldVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Draw the cube.
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, worldVertexPositionBuffer.numItems);

    ////////////////////////////////////////////////////////////////////////

    if (currentObjectVertices) {
        drawInSelection(currentObjectVertices);
    }
    for (var i = 0; i < newObjects.length; i++) {
        drawObject(newObjects[i]);
    }

}

function drawObject(obj) {
    var vertexPositionBuffer = gl.createBuffer();
    var vertices = obj.vertices;
    var x, y, z;
    x = obj.xyz[0];
    y = obj.xyz[1];
    z = obj.xyz[2];


    // Select the vertexPositionBuffer as the one to apply vertex
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    mat4.identity(mvMatrix);
    mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
    mat4.translate(mvMatrix, [-xPosition, -yPosition, -zPosition]);
    // Now pass the list of vertices into WebGL to build the shape. We
    // do this by creating a Float32Array from the JavaScript array,
    // then use it to fill the current vertex buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    vertexPositionBuffer.itemSize = 3;
    vertexPositionBuffer.numItems = vertices.length / 3;

    // TODO textures

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexPositionBuffer.numItems);
}

var currentObjectVertices = [
    -1, 0, 0,
    -1, 0, 1,
    -1, 1, 0,
    -1, 1, 1,

    -1, 1, 0,
    -1, 1, 1,
    1, 1, 0,
    1, 1, 1,

    1, 0, 0,
    1, 0, 1,
    1, 1, 0,
    1, 1, 1
];

var currentObjectTexture = [
    0, 1,
    1, 0
];
var rotator = 0;
var inSelectionObjectDepth = 4;
var inSelectionObjectHeight = 0;
var inSelectionObjectScale = 1;
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
    mat4.rotate(matrika, degToRad(-rotator), [0, 1, 0]);
    mat4.scale(matrika, [inSelectionObjectScale, inSelectionObjectScale, inSelectionObjectScale]);


    var vertx = multiplyMVr(matrika, vertices);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertx), gl.STATIC_DRAW);
    vertexPositionBuffer.itemSize = 3;
    vertexPositionBuffer.numItems = vertices.length / 3;

    // TODO textures

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    mat4.translate(mvMatrix, [0, -inSelectionObjectHeight, -inSelectionObjectDepth]);
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexPositionBuffer.numItems);

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
    mat4.rotate(matrix, degToRad(- rotator), [0, 1, 0]);


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

    newObjects.push({"vertices":newVertices, "texture":currentObjectTexture, "id": newObjestCount++, "xyz":[x, y, z]});

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
        var tmp = xyzn[0] / normal;
        xyzn[0] = tmp;
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
        if (yPosition >= 0.4){
            yPosition += flying * elapsed / 20 * 0.4;
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
    // console.log(event.keyCode);
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
        yawRate = 0.1;
    } else if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
        // Right cursor key or D
        yawRate = -0.1;
    } else {
        yawRate = 0;
    }

    // Spacebar
    if (currentlyPressedKeys[32]){
        flying = 0.05;
    }
    //Ctrl
    else if (currentlyPressedKeys[67]){
        if (yPosition < 0.419){
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

    if (currentlyPressedKeys[90]) {
        // h
        rotator += 0.1;
    } else if (currentlyPressedKeys[85]) {
        // b
        rotator -= 0.1;
    }

}

function metoda() {
    alert("dela");
}

var inputH = document.getElementById("inputH");
var inputW = document.getElementById("inputW");
var sliderH = document.getElementById("sliderH");
var sliderW = document.getElementById("sliderW");

//inputH.innerHTML = sliderH.value;
inputW.innerHTML = sliderW.value;

sliderH.oninput = function() {
    inputH.innerHTML = this.value;
};
sliderW.oninput = function() {
    inputW.innerHTML = this.value;
};
inputH.oninput = function(){
    alert("kebab!");
};

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

        //variable for checking if buttons are visible or not
        var hud = false;

        //disabling default right click event on canvas
        canvas.oncontextmenu = function (e) {
            e.preventDefault();
        };

        //right click event	- hide or show buttons
        canvas.onmousedown = function(e){

            var x = e.clientX;
            var y = e.clientY;

            if (e.which === 3){
                if (hud === true){
                    for (var i = 1; i < 13; i++) {
                        document.getElementById("button"+i).style.visibility="hidden";
                    }
                    document.getElementById("sliderH").style.visibility="hidden";
                    document.getElementById("sliderW").style.visibility="hidden";
                    document.getElementById("inputH").style.visibility="hidden";
                    document.getElementById("inputW").style.visibility="hidden";
                    document.getElementById("textH").style.visibility="hidden";
                    document.getElementById("textW").style.visibility="hidden";
                    document.getElementById("hudBG").style.visibility="hidden";
                    hud = false;
                }
                else {
                    for (var i = 1; i < 13; i++) {
                        document.getElementById("button"+i).style.visibility="visible";
                    }
                    document.getElementById("sliderH").style.visibility="visible";
                    document.getElementById("sliderW").style.visibility="visible";
                    document.getElementById("inputH").style.visibility="visible";
                    document.getElementById("inputW").style.visibility="visible";
                    document.getElementById("textH").style.visibility="visible";
                    document.getElementById("textW").style.visibility="visible";
                    document.getElementById("hudBG").style.visibility="visible";
                    hud = true;
                }
            } else if (e.which === 1) {
                newObject();
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

        document.getElementById("button1").onclick = function() {
            currentObjectVertices = [
                -1, 0, 0,
                -1, 0, 1,
                -1, 1, 0,
                -1, 1, 1,

                -1, 1, 0,
                -1, 1, 1,
                1, 1, 0,
                1, 1, 1,

                1, 0, 0,
                1, 0, 1,
                1, 1, 0,
                1, 1, 1
            ];
        };

        document.getElementById("button12").onclick = function() {
            currentObjectVertices = [];
        };
    }
}

