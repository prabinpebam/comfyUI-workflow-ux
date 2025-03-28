export class NoiseAnimation {
    constructor(canvas, options = {}) {
        this.time = 0;
        this.ripples = [];
        this.stipplePoints = [];
        this.rippleProgram = null;
        this.uTextureLoc = null;
        this.uDisplacementLoc = null;
        this.winResolutionLoc = null;
        this.rippleAmountLoc = null;
        this.noiseTexture = null;
        this.displacementTextureGL = null;
        this.animationFrameId = null;
        this.colorGradient = [];
        this.currentHue = 0;
        this.colorRipples = [];
        this.lastRipplePos = null;
        this.lastColorRippleTime = null;
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error("Could not get 2D rendering context");
        this.ctx = ctx;
        const defaultOptions = {
            speed: 0.005,
            resolutionFactor: 0.9,
            animationEnabled: true,
            invertNoise: true,
            enablePerlin: true,
            perlinScale: 0.004,
            perlinBrightness: 0,
            perlinContrast: 3,
            enablePerlin2: true,
            perlin2Scale: 0.009,
            perlin2Brightness: 0,
            perlin2Contrast: 5,
            rippleEnabled: true,
            rippleAmount: 0.2,
            stippleEnabled: true,
            minDistance: 5,
            minDotSize: 0.1,
            maxDotSize: 2,
            brightnessThreshold: 255,
            displacementEnabled: true,
            displacementAmount: 10
        };
        this.options = { ...defaultOptions, ...options };
        this.baseOffWidth = canvas.width * this.options.resolutionFactor;
        this.baseOffHeight = canvas.height * this.options.resolutionFactor;
        this.offCanvas = document.createElement('canvas');
        const offCtx = this.offCanvas.getContext('2d');
        if (!offCtx)
            throw new Error("Could not get offscreen 2D rendering context");
        this.offCtx = offCtx;
        this.compositeCanvas = document.createElement('canvas');
        this.compositeCanvas.width = canvas.width;
        this.compositeCanvas.height = canvas.height;
        const compositeCtx = this.compositeCanvas.getContext('2d');
        if (!compositeCtx)
            throw new Error("Could not get composite 2D rendering context");
        this.compositeCtx = compositeCtx;
        this.displacementCanvas = document.createElement('canvas');
        this.displacementCanvas.width = this.compositeCanvas.width;
        this.displacementCanvas.height = this.compositeCanvas.height;
        const dispCtx = this.displacementCanvas.getContext('2d');
        if (!dispCtx)
            throw new Error("Could not get displacement 2D rendering context");
        this.dispCtx = dispCtx;
        this.rippleCanvas = document.createElement('canvas');
        this.rippleCanvas.width = this.compositeCanvas.width;
        this.rippleCanvas.height = this.compositeCanvas.height;
        const gl = this.rippleCanvas.getContext('webgl');
        if (!gl)
            throw new Error("Could not get WebGL rendering context");
        this.gl = gl;
        this.updateOffCanvasSize();
        this.initWebGL();
        this.initializeColorGradient();
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (this.lastRipplePos) {
                const dx = x - this.lastRipplePos.x;
                const dy = y - this.lastRipplePos.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 25)
                    return;
            }
            this.ripples.push({
                x,
                y,
                startTime: performance.now(),
                hue: this.currentHue,
                amplitude: 0.2 + Math.random() * 0.3,
                speed: 100 + Math.random() * 50,
                lifetime: 2.0 + Math.random() * 1.5
            });
            this.lastRipplePos = { x, y };
            this.currentHue = (this.currentHue + 2) % 360;
        });
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (this.lastColorRippleTime && (performance.now() - this.lastColorRippleTime) < 100) {
                return;
            }
            this.colorRipples.push({ x, y, startTime: performance.now(), hue: this.currentHue });
            this.lastColorRippleTime = performance.now();
            this.currentHue = (this.currentHue + 5) % 360;
        });
        this.animate = this.animate.bind(this);
    }
    updateOptions(newOptions) {
        Object.assign(this.options, newOptions);
        if (newOptions.resolutionFactor || newOptions.displacementEnabled ||
            newOptions.displacementAmount || newOptions.minDistance) {
            this.updateOffCanvasSize();
        }
    }
    extraMargin() {
        return this.options.displacementEnabled ?
            this.options.displacementAmount * this.options.resolutionFactor : 0;
    }
    updateOffCanvasSize() {
        this.baseOffWidth = this.canvas.width * this.options.resolutionFactor;
        this.baseOffHeight = this.canvas.height * this.options.resolutionFactor;
        const extMargin = this.extraMargin();
        this.offCanvas.width = this.baseOffWidth;
        this.offCanvas.height = this.baseOffHeight + extMargin;
        this.stipplePoints = this.generatePoissonPoints(this.offCanvas.width, this.offCanvas.height, this.options.minDistance);
    }
    generatePoissonPoints(width, height, minDist, k = 30) {
        const cellSize = minDist / Math.SQRT2;
        const gridWidth = Math.ceil(width / cellSize);
        const gridHeight = Math.ceil(height / cellSize);
        const grid = new Array(gridWidth * gridHeight).fill(null);
        const points = [];
        const active = [];
        const gridIndex = (x, y) => x + y * gridWidth;
        const addPoint = (pt) => {
            points.push(pt);
            active.push(pt);
            const gx = Math.floor(pt.x / cellSize);
            const gy = Math.floor(pt.y / cellSize);
            grid[gridIndex(gx, gy)] = pt;
        };
        addPoint({ x: Math.random() * width, y: Math.random() * height });
        while (active.length) {
            const randIndex = Math.floor(Math.random() * active.length);
            const point = active[randIndex];
            let found = false;
            for (let i = 0; i < k; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const mag = minDist * (1 + Math.random());
                const newX = point.x + Math.cos(angle) * mag;
                const newY = point.y + Math.sin(angle) * mag;
                const newPt = { x: newX, y: newY };
                if (newX < 0 || newX >= width || newY < 0 || newY >= height)
                    continue;
                const gx = Math.floor(newX / cellSize);
                const gy = Math.floor(newY / cellSize);
                let ok = true;
                for (let ix = Math.max(0, gx - 2); ix <= Math.min(gx + 2, gridWidth - 1); ix++) {
                    for (let iy = Math.max(0, gy - 2); iy <= Math.min(gy + 2, gridHeight - 1); iy++) {
                        const neighbor = grid[gridIndex(ix, iy)];
                        if (neighbor) {
                            const dx = neighbor.x - newX;
                            const dy = neighbor.y - newY;
                            if (dx * dx + dy * dy < minDist * minDist) {
                                ok = false;
                            }
                        }
                    }
                }
                if (ok) {
                    addPoint(newPt);
                    found = true;
                    break;
                }
            }
            if (!found) {
                active.splice(randIndex, 1);
            }
        }
        return points;
    }
    generateNoiseImage() {
        const width = this.offCanvas.width;
        const extHeight = this.offCanvas.height;
        const imageData = this.offCtx.createImageData(width, extHeight);
        const data = imageData.data;
        const cx = width / 2;
        const cy = this.baseOffHeight / 2;
        for (let y = 0; y < extHeight; y++) {
            for (let x = 0; x < width; x++) {
                const nx = (x - cx) * this.options.perlinScale;
                const ny = (y - cy) * this.options.perlinScale;
                const n2x = (x - cx) * this.options.perlin2Scale;
                const n2y = (y - cy) * this.options.perlin2Scale;
                let perlinVal, perlin2Val;
                if (this.options.enablePerlin) {
                    const val1 = noise.perlin2(nx + this.time, ny + this.time);
                    perlinVal = (val1 + 1) * 127.5;
                    perlinVal = (perlinVal - 128) * this.options.perlinContrast + 128 + this.options.perlinBrightness;
                }
                else {
                    perlinVal = 127.5;
                }
                if (this.options.enablePerlin2) {
                    const val2 = noise.perlin2(n2x - this.time, n2y - this.time);
                    perlin2Val = (val2 + 1) * 127.5;
                    perlin2Val = (perlin2Val - 128) * this.options.perlin2Contrast + 128 + this.options.perlin2Brightness;
                }
                else {
                    perlin2Val = 127.5;
                }
                if (this.options.invertNoise) {
                    perlinVal = 255 - perlinVal;
                    perlin2Val = 255 - perlin2Val;
                }
                let combined = (perlinVal + perlin2Val) / 2;
                combined = Math.max(0, Math.min(255, Math.floor(combined)));
                const idx = (y * width + x) * 4;
                data[idx] = combined;
                data[idx + 1] = combined;
                data[idx + 2] = combined;
                data[idx + 3] = 255;
            }
        }
        return imageData;
    }
    updateDisplacementTexture() {
        this.dispCtx.clearRect(0, 0, this.displacementCanvas.width, this.displacementCanvas.height);
        const currentTime = performance.now();
        this.dispCtx.globalCompositeOperation = 'lighter';
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            const age = (currentTime - ripple.startTime) / 1000;
            if (age > ripple.lifetime) {
                this.ripples.splice(i, 1);
                continue;
            }
            const radius = ripple.speed * age;
            const thickness = Math.max(1, 8 * (1 - age / ripple.lifetime));
            const normalizedAge = age / ripple.lifetime;
            let fadeFunction;
            if (normalizedAge < 0.2) {
                fadeFunction = Math.pow(normalizedAge / 0.2, 2) * 0.8 + 0.2;
            }
            else if (normalizedAge > 0.7) {
                fadeFunction = Math.pow(1.0 - (normalizedAge - 0.7) / 0.3, 2) * 0.8;
            }
            else {
                fadeFunction = 0.8 + Math.sin((normalizedAge - 0.2) / 0.5 * Math.PI) * 0.2;
            }
            const amplitude = ripple.amplitude * fadeFunction;
            const innerRadius = Math.max(0, radius - thickness);
            const outerRadius = radius + thickness;
            const grad = this.dispCtx.createRadialGradient(ripple.x, ripple.y, innerRadius, ripple.x, ripple.y, outerRadius);
            grad.addColorStop(0, `rgba(0,0,0,0)`);
            grad.addColorStop(0.5, `hsla(${ripple.hue}, 100%, 50%, ${amplitude})`);
            grad.addColorStop(1.0, `rgba(0,0,0,0)`);
            this.dispCtx.fillStyle = grad;
            this.dispCtx.beginPath();
            this.dispCtx.arc(ripple.x, ripple.y, outerRadius, 0, Math.PI * 2);
            this.dispCtx.fill();
        }
        this.dispCtx.globalCompositeOperation = 'source-over';
    }
    initWebGL() {
        const gl = this.gl;
        const vertexShaderSource = `
      attribute vec2 aPosition;
      attribute vec2 aTexCoord;
      varying vec2 vUv;
      void main() {
        vUv = aTexCoord;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;
        const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D uTexture;
      uniform sampler2D uDisplacement;
      uniform vec4 winResolution;
      uniform float rippleAmount;
      varying vec2 vUv;
      float PI = 3.141592653589793238;
      
      void main() {
        vec2 vUvScreen = gl_FragCoord.xy / winResolution.xy;
        vec4 displacement = texture2D(uDisplacement, vUvScreen);
        
        // Get the displacement direction from the red and green channels
        // treating them as a vector field
        vec2 dir = displacement.rg * 2.0 - 1.0;
        
        // Calculate displacement magnitude for more realistic water-like effect
        // with a non-linear curve
        float magnitude = length(dir) * rippleAmount * sin(PI * displacement.r);
        
        // Apply displacement to texture coordinates with proper normalization
        vec2 uv = vUvScreen + normalize(dir) * magnitude;
        
        // Clamp the coordinates to prevent sampling outside the texture
        uv = clamp(uv, 0.0, 1.0);
        
        vec4 color = texture2D(uTexture, uv);
        gl_FragColor = color;
      }
    `;
        const compileShader = (source, type) => {
            const shader = gl.createShader(type);
            if (!shader)
                return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };
        const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) {
            return;
        }
        const program = gl.createProgram();
        if (!program)
            return;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link failed: ' + gl.getProgramInfoLog(program));
            return;
        }
        this.rippleProgram = program;
        gl.useProgram(this.rippleProgram);
        const quadVertices = new Float32Array([
            -1, -1, 0, 0,
            1, -1, 1, 0,
            -1, 1, 0, 1,
            -1, 1, 0, 1,
            1, -1, 1, 0,
            1, 1, 1, 1,
        ]);
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
        const aPosition = gl.getAttribLocation(this.rippleProgram, 'aPosition');
        const aTexCoord = gl.getAttribLocation(this.rippleProgram, 'aTexCoord');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);
        this.uTextureLoc = gl.getUniformLocation(this.rippleProgram, 'uTexture');
        this.uDisplacementLoc = gl.getUniformLocation(this.rippleProgram, 'uDisplacement');
        this.winResolutionLoc = gl.getUniformLocation(this.rippleProgram, 'winResolution');
        this.rippleAmountLoc = gl.getUniformLocation(this.rippleProgram, 'rippleAmount');
        gl.uniform4f(this.winResolutionLoc, this.rippleCanvas.width, this.rippleCanvas.height, 0, 0);
        this.noiseTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        this.displacementTextureGL = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.displacementTextureGL);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    applyRippleEffect(noiseImageData) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, noiseImageData.width, noiseImageData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseImageData.data);
        gl.uniform1i(this.uTextureLoc, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.displacementTextureGL);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.displacementCanvas);
        gl.uniform1i(this.uDisplacementLoc, 1);
        gl.uniform1f(this.rippleAmountLoc, this.options.rippleAmount * 0.03);
        gl.viewport(0, 0, this.rippleCanvas.width, this.rippleCanvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const pixels = new Uint8Array(this.rippleCanvas.width * this.rippleCanvas.height * 4);
        gl.readPixels(0, 0, this.rippleCanvas.width, this.rippleCanvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return new ImageData(new Uint8ClampedArray(pixels), this.rippleCanvas.width, this.rippleCanvas.height);
    }
    drawStipple(imageData) {
        this.compositeCtx.clearRect(0, 0, this.compositeCanvas.width, this.compositeCanvas.height);
        const scaleX = this.compositeCanvas.width / this.offCanvas.width;
        const scaleY = this.compositeCanvas.height / this.baseOffHeight;
        for (const pt of this.stipplePoints) {
            const brightnessVal = this.sampleBrightness(imageData, pt.x, pt.y);
            if (brightnessVal > this.options.brightnessThreshold)
                continue;
            const dotSizeRatio = (1 - brightnessVal / 255);
            const radius = this.options.minDotSize + dotSizeRatio *
                (this.options.maxDotSize - this.options.minDotSize);
            let drawX = pt.x * scaleX;
            let drawY = pt.y * scaleY;
            if (this.options.displacementEnabled) {
                const disp = (brightnessVal / 255) * this.options.displacementAmount;
                drawY -= disp;
            }
            let baseColor = this.getGradientColor(dotSizeRatio);
            const rippleEffect = this.getColorRippleInfluence(drawX, drawY);
            if (rippleEffect) {
                const baseHSL = this.parseHSL(baseColor);
                const blendFactor = rippleEffect.influence;
                let hueDiff = rippleEffect.hue - baseHSL.h;
                if (hueDiff > 180)
                    hueDiff -= 360;
                if (hueDiff < -180)
                    hueDiff += 360;
                const blendedHue = (baseHSL.h + hueDiff * blendFactor) % 360;
                const blendedSaturation = Math.min(100, baseHSL.s + (25 * blendFactor));
                const blendedLightness = baseHSL.l + (5 * blendFactor);
                const dotOpacity = 0.8 + (0.2 * blendFactor);
                const dotColor = `hsla(${blendedHue}, ${blendedSaturation}%, ${blendedLightness}%, ${dotOpacity})`;
                this.compositeCtx.fillStyle = dotColor;
            }
            else {
                this.compositeCtx.fillStyle = baseColor;
            }
            this.compositeCtx.beginPath();
            this.compositeCtx.arc(drawX, drawY, radius, 0, Math.PI * 2);
            this.compositeCtx.fill();
        }
    }
    getColorRippleInfluence(x, y) {
        const currentTime = performance.now();
        const rippleDuration = 3.0;
        const maxRippleRadius = 300;
        this.colorRipples = this.colorRipples.filter(ripple => (currentTime - ripple.startTime) / 1000 <= rippleDuration);
        if (this.colorRipples.length === 0)
            return null;
        let maxInfluence = 0;
        let resultHue = 0;
        for (const ripple of this.colorRipples) {
            const dx = x - ripple.x;
            const dy = y - ripple.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const age = (currentTime - ripple.startTime) / 1000;
            const currentRadius = (age / rippleDuration) * maxRippleRadius;
            const rippleWidth = maxRippleRadius * 0.3;
            const distanceFromRing = Math.abs(distance - currentRadius);
            if (distanceFromRing <= rippleWidth) {
                const normalizedDistance = distanceFromRing / rippleWidth;
                const ringInfluence = 1 - (normalizedDistance * normalizedDistance * normalizedDistance);
                let ageInfluence;
                if (age < rippleDuration * 0.3) {
                    ageInfluence = Math.pow(age / (rippleDuration * 0.3), 2) * 0.4 + 0.6;
                }
                else {
                    const normalizedRemainingAge = (age - rippleDuration * 0.3) / (rippleDuration * 0.7);
                    ageInfluence = 1 - Math.pow(normalizedRemainingAge, 1.5);
                }
                const influence = ringInfluence * ageInfluence * 0.8;
                if (influence > maxInfluence) {
                    maxInfluence = influence;
                    resultHue = ripple.hue;
                }
            }
        }
        return maxInfluence > 0 ? { hue: resultHue, influence: maxInfluence } : null;
    }
    parseHSL(hslString) {
        const regex = /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/;
        const match = hslString.match(regex);
        if (match && match.length >= 4) {
            return {
                h: parseInt(match[1], 10),
                s: parseInt(match[2], 10),
                l: parseInt(match[3], 10)
            };
        }
        return { h: 0, s: 70, l: 80 };
    }
    findNearestRipple(x, y) {
        var _a;
        if (this.ripples.length === 0)
            return null;
        return ((_a = this.ripples.reduce((nearest, ripple) => {
            const dx = ripple.x - x;
            const dy = ripple.y - y;
            const distSq = dx * dx + dy * dy;
            if (!nearest || distSq < nearest.distSq) {
                return { ripple, distSq };
            }
            return nearest;
        }, null)) === null || _a === void 0 ? void 0 : _a.ripple) || null;
    }
    drawNoise(imageData) {
        this.offCtx.putImageData(imageData, 0, 0);
        this.compositeCtx.clearRect(0, 0, this.compositeCanvas.width, this.compositeCanvas.height);
        this.compositeCtx.drawImage(this.offCanvas, 0, 0, this.offCanvas.width, this.baseOffHeight, 0, 0, this.compositeCanvas.width, this.compositeCanvas.height);
    }
    sampleBrightness(imageData, x, y) {
        const ix = Math.floor(Math.max(0, Math.min(x, imageData.width - 1)));
        const iy = Math.floor(Math.max(0, Math.min(y, imageData.height - 1)));
        return imageData.data[(iy * imageData.width + ix) * 4];
    }
    generateColor(hue) {
        const saturation = 50 + Math.random() * 50;
        const lightness = 30 + Math.random() * 40;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    initializeColorGradient() {
        const baseHue = Math.random() * 360;
        const colors = [
            this.generateColor(baseHue),
            this.generateColor((baseHue + 90) % 360),
            this.generateColor((baseHue + 180) % 360),
            this.generateColor((baseHue + 270) % 360)
        ];
        this.colorGradient = colors.map(color => ({
            color,
            position: Math.random() * 100
        }));
        this.colorGradient.sort((a, b) => a.position - b.position);
    }
    getGradientColor(position) {
        var _a, _b;
        const p = position * 100;
        const lower = this.colorGradient.reduce((prev, curr) => curr.position <= p ? curr : prev, this.colorGradient[0]);
        const upper = this.colorGradient.reduce((prev, curr) => curr.position > p && curr.position < prev.position ? curr : prev, { color: this.colorGradient[0].color, position: 101 });
        if (p <= this.colorGradient[0].position)
            return this.colorGradient[0].color;
        if (p >= this.colorGradient[this.colorGradient.length - 1].position)
            return this.colorGradient[this.colorGradient.length - 1].color;
        const range = upper.position - lower.position;
        const factor = (p - lower.position) / range;
        const color1 = ((_a = lower.color.match(/\d+/g)) === null || _a === void 0 ? void 0 : _a.map(Number)) || [0, 0, 0];
        const color2 = ((_b = upper.color.match(/\d+/g)) === null || _b === void 0 ? void 0 : _b.map(Number)) || [0, 0, 0];
        return `hsl(${Math.round(color1[0] + (color2[0] - color1[0]) * factor)}, 70%, 80%)`;
    }
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate);
        if (this.options.animationEnabled) {
            this.time += this.options.speed;
        }
        let noiseImageData = this.generateNoiseImage();
        if (this.options.rippleEnabled) {
            this.updateDisplacementTexture();
            noiseImageData = this.applyRippleEffect(noiseImageData);
            this.compositeCtx.clearRect(0, 0, this.compositeCanvas.width, this.compositeCanvas.height);
            this.compositeCtx.putImageData(noiseImageData, 0, 0);
        }
        else {
            this.drawNoise(noiseImageData);
        }
        if (this.options.stippleEnabled) {
            this.drawStipple(noiseImageData);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.compositeCanvas, 0, 0, this.canvas.width, this.canvas.height);
    }
    start() {
        if (!this.animationFrameId) {
            this.initializeColorGradient();
            this.animate();
        }
    }
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.initializeColorGradient();
        }
    }
    clear() {
        this.stop();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.compositeCtx.clearRect(0, 0, this.compositeCanvas.width, this.compositeCanvas.height);
        this.dispCtx.clearRect(0, 0, this.displacementCanvas.width, this.displacementCanvas.height);
        this.time = 0;
        this.ripples = [];
        this.colorRipples = [];
        this.currentHue = 0;
        this.initializeColorGradient();
    }
}
