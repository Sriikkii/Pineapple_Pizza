class Tokenizer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.tokens = [];
  }

  tokenize() {
    while (!this.isEOF()) {
      this.skipWhitespace();
      if (this.isEOF()) break;

      const ch = this.peek();

      if (ch === '[' || ch === ']' || ch === ';') {
        this.tokens.push({ type: ch, value: ch });
        this.advance();
        continue;
      }

      if (ch === '@') {
        this.advance();
        const timeValue = this.readWhile((c) => /[0-9.]/.test(c));
        const unit = this.readWhile((c) => /[a-zA-Z%]/.test(c));
        if (!timeValue || !unit) throw new Error(`Invalid timeline marker near position ${this.pos}`);
        this.tokens.push({ type: 'TIME_MARK', value: `${timeValue}${unit}` });
        continue;
      }

      if (this.isWordStart(ch)) {
        const word = this.readWhile((c) => this.isWordChar(c));
        this.tokens.push({ type: this.keywordType(word), value: word });
        continue;
      }

      if (this.isNumberStart(ch)) {
        const numberish = this.readWhile((c) => /[0-9.+\-a-zA-Z%]/.test(c));
        this.tokens.push({ type: 'VALUE', value: numberish });
        continue;
      }

      if (ch === '#') {
        this.advance();
        const hex = this.readWhile((c) => /[0-9a-fA-F]/.test(c));
        if (!hex) throw new Error(`Invalid color near position ${this.pos}`);
        this.tokens.push({ type: 'VALUE', value: `#${hex}` });
        continue;
      }

      throw new Error(`Unexpected character '${ch}' at position ${this.pos}`);
    }

    this.tokens.push({ type: 'EOF', value: null });
    return this.tokens;
  }

  keywordType(word) {
    const keywords = new Set([
      'scene',
      'object',
      'shape',
      'position',
      'time',
      'repeat',
      'easing',
      'color',
      'size',
      'top',
      'left',
      'right',
      'up',
      'down',
      'rotate',
      'scale',
      'opacity'
    ]);

    return keywords.has(word) ? word.toUpperCase() : 'IDENT';
  }

  isEOF() {
    return this.pos >= this.input.length;
  }

  peek() {
    return this.input[this.pos];
  }

  advance() {
    this.pos += 1;
  }

  readWhile(predicate) {
    const start = this.pos;
    while (!this.isEOF() && predicate(this.peek())) this.advance();
    return this.input.slice(start, this.pos);
  }

  skipWhitespace() {
    this.readWhile((c) => /\s/.test(c));
  }

  isWordStart(ch) {
    return /[a-zA-Z_]/.test(ch);
  }

  isWordChar(ch) {
    return /[a-zA-Z0-9_\-.]/.test(ch);
  }

  isNumberStart(ch) {
    return /[0-9.+\-]/.test(ch);
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parseProgram() {
    const scene = this.parseScene();
    this.expect('EOF');
    return { type: 'Program', scene };
  }

  parseScene() {
    this.expect('SCENE');
    const name = this.expect('IDENT').value;
    this.expect('[');
    const objects = [];

    while (!this.match(']')) {
      objects.push(this.parseObject());
    }

    this.expect(']');
    return { type: 'Scene', name, objects };
  }

  parseObject() {
    this.expect('OBJECT');
    const name = this.expect('IDENT').value;
    this.expect('[');

    const properties = {};
    const timeline = [];

    while (!this.match(']')) {
      if (this.match('TIME_MARK')) {
        timeline.push(this.parseTimelineStep());
      } else {
        const prop = this.parseProperty();
        properties[prop.name] = prop.value;
      }
    }

    this.expect(']');
    return { type: 'Object', name, properties, timeline };
  }

  parseProperty() {
    const token = this.consume();
    const validProperties = new Set([
      'SHAPE', 'POSITION', 'TIME', 'REPEAT', 'EASING', 'COLOR', 'SIZE', 'TOP', 'LEFT'
    ]);

    if (!validProperties.has(token.type)) {
      throw new Error(`Expected property token, got ${token.type}`);
    }

    const valueToken = this.consume();
    if (!['IDENT', 'VALUE'].includes(valueToken.type) && !valueToken.type.endsWith('_')) {
      
    }

    this.expect(';');

    return {
      type: 'Property',
      name: token.value,
      value: valueToken.value
    };
  }

  parseTimelineStep() {
    const time = this.expect('TIME_MARK').value;

    const actionToken = this.consume();
    const validActions = new Set(['RIGHT', 'LEFT', 'UP', 'DOWN', 'ROTATE', 'SCALE', 'OPACITY']);
    if (!validActions.has(actionToken.type)) {
      throw new Error(`Expected timeline action, got ${actionToken.type}`);
    }

    const value = this.expectAny(['VALUE', 'IDENT']).value;
    this.expect(';');

    return {
      type: 'TimelineStep',
      time,
      action: actionToken.value,
      value
    };
  }

  current() {
    return this.tokens[this.pos];
  }

  consume() {
    return this.tokens[this.pos++];
  }

  match(type) {
    return this.current().type === type;
  }

  expect(type) {
    const token = this.current();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type}`);
    }
    this.pos += 1;
    return token;
  }

  expectAny(types) {
    const token = this.current();
    if (!types.includes(token.type)) {
      throw new Error(`Expected one of ${types.join(', ')}, got ${token.type}`);
    }
    this.pos += 1;
    return token;
  }
}

class CodeGenerator {
  constructor(ast) {
    this.ast = ast;
  }

  generate() {
    const scene = this.ast.scene;
    const cssBlocks = [];
    const objectHtml = [];
    const svgDefs = []; 

    cssBlocks.push(this.sceneCSS(scene.name));

    for (const obj of scene.objects) {
      const className = `${scene.name}-${obj.name}`;
      const keyframesName = `${className}-kf`;
      
      
      if (obj.properties.shape === 'wave') {
        const waveHtml = this.generateWaveSVG(className, obj);
        objectHtml.push(waveHtml);
        const animationCSS = this.waveSVGCSS(className, keyframesName, obj);
        const keyframesCSS = this.keyframesCSS(keyframesName, obj);
        cssBlocks.push(animationCSS, keyframesCSS);
      } else {
        const animationCSS = this.objectCSS(className, keyframesName, obj);
        const keyframesCSS = this.keyframesCSS(keyframesName, obj);
        cssBlocks.push(animationCSS, keyframesCSS);
        objectHtml.push(`<div class="dsl-object ${className}"></div>`);
      }
    }

    const html = `<div class="dsl-scene ${scene.name}">${objectHtml.join('')}</div>`;
    const css = cssBlocks.join('\n\n');

    return { html, css };
  }

  sceneCSS(sceneName) {
    return [
      `* { margin: 0; padding: 0; box-sizing: border-box; }`,
      `body { margin: 0; padding: 0; }`,
      `.dsl-scene.${sceneName} {`,
      `  position: relative;`,
      `  width: 100%;`,
      `  height: 300px;`,
      `  overflow: hidden;`,
      `  background: linear-gradient(180deg, #87ceeb 0%, #4682b4 100%);`,
      `}`
    ].join('\n');
  }

  objectCSS(className, keyframesName, obj) {
    const p = obj.properties;
    const duration = p.time || '1s';
    const repeat = p.repeat || '1';
    const easing = p.easing || 'linear';
    const position = p.position || 'absolute';
    const top = p.top || '0px';
    const left = p.left || '0px';

    const baseShape = this.shapeStyles(p.shape, p.size, p.color);

    return [
      `.dsl-object.${className} {`,
      `  position: ${position};`,
      `  top: ${top};`,
      `  left: ${left};`,
      `  ${baseShape}`,
      `  animation: ${keyframesName} ${duration} ${easing} ${repeat};`,
      `}`
    ].join('\n');
  }

  generateWaveSVG(className, obj) {
    const p = obj.properties;
    const width = this.parseNumeric(p.size) || 1200;
    const height = Math.floor(width * 0.2);
    const color = p.color || '#4da6ff';
    const resolvedColor = this.resolveColor(color);
    
  
    const svgs = [];
    
    for (let layer = 0; layer < 3; layer++) {
      const opacity = 0.9 - layer * 0.2;
      const brightness = 1 + layer * 0.15;
      const waveColor = this.adjustColorBrightness(resolvedColor, brightness);
      const amplitude = 15 - layer * 3;
      const frequency = 3;
      
      svgs.push(`
        <svg class="wave-layer wave-layer-${layer}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width * 2} ${height}" preserveAspectRatio="none">
          ${this.generateWaveGroupPath(width * 2, height, amplitude, frequency, waveColor, opacity)}
        </svg>
      `);
    }
    
    return `<div class="dsl-object dsl-wave ${className}" style="width: ${width}px; height: ${height}px;">
      ${svgs.join('')}
    </div>`;
  }

  generateWaveGroupPath(width, height, amplitude, frequency, color, opacity) {
    const baseY = height * 0.6;
    const points = 200;
    let path = `M 0,${baseY}`;
    
    for (let i = 0; i <= points; i++) {
      const x = (width / points) * i;
      const angle = (x / width) * Math.PI * 2 * frequency;
      const y = baseY + Math.sin(angle) * amplitude;
      path += ` L ${x},${y}`;
    }
    
    path += ` L ${width},${height} L 0,${height} Z`;
    
    return `<path d="${path}" fill="${color}" opacity="${opacity}"/>`;
  }

  adjustColorBrightness(color, factor) {
    
    if (!color.startsWith('#')) return color;
    
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.min(255, Math.floor(r * factor));
    const newG = Math.min(255, Math.floor(g * factor));
    const newB = Math.min(255, Math.floor(b * factor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  waveSVGCSS(className, keyframesName, obj) {
    const p = obj.properties;
    const duration = p.time || '1s';
    const repeat = p.repeat || '1';
    const easing = p.easing || 'linear';
    const position = p.position || 'absolute';
    const top = p.top || '0px';
    const left = p.left || '0px';

    return [
      `.dsl-wave.${className} {`,
      `  position: ${position};`,
      `  top: ${top};`,
      `  left: ${left};`,
      `  overflow: hidden;`,
      `}`,
      ``,
      `/* Wave layers that create the waving motion */`,
      `.dsl-wave.${className} .wave-layer {`,
      `  position: absolute;`,
      `  top: 0;`,
      `  left: 0;`,
      `  width: 200%;`,
      `  height: 100%;`,
      `}`,
      ``,
      `.dsl-wave.${className} .wave-layer-0 {`,
      `  animation: wave-motion-1 ${duration} ${easing} ${repeat};`,
      `}`,
      ``,
      `.dsl-wave.${className} .wave-layer-1 {`,
      `  animation: wave-motion-2 calc(${duration} * 1.3) ${easing} ${repeat};`,
      `}`,
      ``,
      `.dsl-wave.${className} .wave-layer-2 {`,
      `  animation: wave-motion-3 calc(${duration} * 1.7) ${easing} ${repeat};`,
      `}`,
      ``,
      `@keyframes wave-motion-1 {`,
      `  0% { transform: translateX(0); }`,
      `  100% { transform: translateX(-50%); }`,
      `}`,
      ``,
      `@keyframes wave-motion-2 {`,
      `  0% { transform: translateX(0); }`,
      `  100% { transform: translateX(-50%); }`,
      `}`,
      ``,
      `@keyframes wave-motion-3 {`,
      `  0% { transform: translateX(0); }`,
      `  100% { transform: translateX(-50%); }`,
      `}`
    ].join('\n');
  }

  keyframesCSS(name, obj) {
    const durationSeconds = this.toSeconds(obj.properties.time || '1s');
    const stateByTime = this.buildAccumulatedState(obj.timeline);

    const lines = [`@keyframes ${name} {`];

    for (const [t, _] of stateByTime) {
      const pct = (t / durationSeconds) * 100;
      const safePct = Math.min(100, Math.max(0, pct));
      const s = stateByTime.get(t);
      lines.push(`  ${safePct.toFixed(2)}% {`);
      lines.push(`    transform: translate(${s.x}px, ${s.y}px) rotate(${s.rotate}deg) scale(${s.scale});`);
      lines.push(`    opacity: ${s.opacity};`);
      lines.push(`  }`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  buildAccumulatedState(steps) {
    const grouped = new Map();
    for (const step of steps) {
      const sec = this.toSeconds(step.time);
      if (!grouped.has(sec)) grouped.set(sec, []);
      grouped.get(sec).push(step);
    }

    const timeline = new Map();
    const state = { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
    timeline.set(0, { ...state });

    const orderedTimes = Array.from(grouped.keys()).sort((a, b) => a - b);
    for (const time of orderedTimes) {
      for (const step of grouped.get(time)) {
        this.applyStep(state, step);
      }
      timeline.set(time, { ...state });
    }

    return timeline;
  }

  applyStep(state, step) {
    const numeric = this.parseNumeric(step.value);
    switch (step.action) {
      case 'right':
        state.x += numeric;
        break;
      case 'left':
        state.x -= numeric;
        break;
      case 'up':
        state.y -= numeric;
        break;
      case 'down':
        state.y += numeric;
        break;
      case 'rotate':
        state.rotate += numeric;
        break;
      case 'scale':
        state.scale *= numeric;
        break;
      case 'opacity':
        state.opacity = numeric;
        break;
      default:
        throw new Error(`Unsupported action: ${step.action}`);
    }
  }

  shapeStyles(shape = 'square', size, color) {
    
    let defaultSize = '50px';
    let defaultColor = 'black';
    
    
    const finalSize = size || defaultSize;
    const finalColor = color || defaultColor;
    
    
    const resolvedColor = this.resolveColor(finalColor);
    
    if (shape === 'circle') {
      return `width: ${finalSize}; height: ${finalSize}; background: ${resolvedColor}; border-radius: 50%;`;
    }

    if (shape === 'wave') {
      
      return `display: block;`;
    }

    return `width: ${finalSize}; height: ${finalSize}; background: ${resolvedColor};`;
  }

  resolveColor(color) {
    if (!color) return '#3b82f6'; 
    
    
    if (color.startsWith('#') || color.startsWith('rgb') || ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'pink', 'purple', 'gray', 'indigo', 'teal', 'cyan'].includes(color)) {
      return color;
    }
    
    
    const tailwindColors = {
      // Yellow
      'yellow-100': '#fef3c7',
      'yellow-200': '#fde68a',
      'yellow-300': '#fde047',
      'yellow-400': '#facc15',
      'yellow-500': '#eab308',
      'yellow-600': '#ca8a04',
      // Blue
      'blue-100': '#dbeafe',
      'blue-200': '#bfdbfe',
      'blue-300': '#93c5fd',
      'blue-400': '#60a5fa',
      'blue-500': '#3b82f6',
      'blue-600': '#2563eb',
      // Green
      'green-100': '#dcfce7',
      'green-200': '#bbf7d0',
      'green-300': '#86efac',
      'green-400': '#4ade80',
      'green-500': '#22c55e',
      'green-600': '#16a34a',
      // Red
      'red-100': '#fee2e2',
      'red-200': '#fecaca',
      'red-300': '#fca5a5',
      'red-400': '#f87171',
      'red-500': '#ef4444',
      'red-600': '#dc2626',
      // Purple
      'purple-100': '#f3e8ff',
      'purple-200': '#e9d5ff',
      'purple-300': '#d8b4fe',
      'purple-400': '#c084fc',
      'purple-500': '#a855f7',
      'purple-600': '#9333ea',
      // Orange
      'orange-100': '#ffedd5',
      'orange-200': '#fed7aa',
      'orange-300': '#fdba74',
      'orange-400': '#fb923c',
      'orange-500': '#f97316',
      'orange-600': '#ea580c',
      // Pink
      'pink-100': '#fce7f3',
      'pink-200': '#fbcfe8',
      'pink-300': '#f9a8d4',
      'pink-400': '#f472b6',
      'pink-500': '#ec4899',
      'pink-600': '#db2777',
      // Gray
      'gray-100': '#f3f4f6',
      'gray-200': '#e5e7eb',
      'gray-300': '#d1d5db',
      'gray-400': '#9ca3af',
      'gray-500': '#6b7280',
      'gray-600': '#4b5563',
      // Sky/Cyan
      'sky-300': '#7dd3fc',
      'cyan-300': '#67e8f9',
      'teal-300': '#5eead4',
      'indigo-300': '#a5b4fc',
    };
    
    return tailwindColors[color] || color;
  }

  toSeconds(timeLiteral) {
    const m = /^([0-9]*\.?[0-9]+)(ms|s)$/.exec(String(timeLiteral).trim());
    if (!m) throw new Error(`Invalid time literal: ${timeLiteral}`);
    const value = parseFloat(m[1]);
    const unit = m[2];
    return unit === 'ms' ? value / 1000 : value;
  }

  parseNumeric(valueLiteral) {
    if (!valueLiteral) return 0;
    const str = String(valueLiteral);
    const n = parseFloat(str.replace(/[^0-9.+\-]/g, ''));
    if (Number.isNaN(n)) return 0; 
    return n;
  }
}

function compileAnimationDSL(dslInput) {
  const tokenizer = new Tokenizer(dslInput);
  const tokens = tokenizer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parseProgram();
  const generator = new CodeGenerator(ast);
  const output = generator.generate();
  return { tokens, ast, ...output };
}

function injectToDOM(compiled, mount = document.body) {
  const styleTag = document.createElement('style');
  styleTag.setAttribute('data-dsl', 'animation-compiler');
  styleTag.textContent = compiled.css;
  document.head.appendChild(styleTag);

  const container = document.createElement('div');
  container.innerHTML = compiled.html;
  mount.appendChild(container.firstElementChild);
}

const animationDslCompilerAPI = {
  Tokenizer,
  Parser,
  CodeGenerator,
  compileAnimationDSL,
  injectToDOM
};

function getExampleDSL() {
  return `
scene ocean[
  object water[
    shape wave;
    position relative;
    time 6s;
    repeat infinite;
    easing linear;
    color #4da6ff;
    size 120px;
    top 120px;
    left 0px;

    @0s right 0px;
    @3s right 120px;
    @6s right 80px;
  ]
]
`;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node animationDslCompiler.js --file <path-to-dsl-file>');
  console.log('  node animationDslCompiler.js --dsl "scene demo[ ... ]"');
  console.log('  cat input.dsl | node animationDslCompiler.js --stdin');
  console.log('  node animationDslCompiler.js            # paste DSL input interactively');
  console.log('  node animationDslCompiler.js --files --outdir ./dsl-output');
}

function getCLIInput(argv, fs) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    return { type: 'help', value: null };
  }

  const fileIndex = argv.indexOf('--file');
  if (fileIndex !== -1) {
    const filePath = argv[fileIndex + 1];
    if (!filePath) {
      throw new Error('Missing value for --file');
    }
    return { type: 'dsl', value: fs.readFileSync(filePath, 'utf8') };
  }

  const dslIndex = argv.indexOf('--dsl');
  if (dslIndex !== -1) {
    const dslValue = argv[dslIndex + 1];
    if (!dslValue) {
      throw new Error('Missing value for --dsl');
    }
    return { type: 'dsl', value: dslValue };
  }

  if (argv.includes('--stdin')) {
    return { type: 'dsl', value: fs.readFileSync(0, 'utf8') };
  }

  return { type: 'interactive', value: null };
}

function getOptionValue(argv, optionName) {
  const optionIndex = argv.indexOf(optionName);
  if (optionIndex === -1) return null;
  const value = argv[optionIndex + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${optionName}`);
  }
  return value;
}

function writeOutputFiles(compiled, outputDir, fs, path) {
  const resolvedOutputDir = path.resolve(outputDir);
  fs.mkdirSync(resolvedOutputDir, { recursive: true });

  const cssPath = path.join(resolvedOutputDir, 'styles.css');
  const jsPath = path.join(resolvedOutputDir, 'script.js');
  const htmlPath = path.join(resolvedOutputDir, 'index.html');

  const scriptContent = [
    "document.addEventListener('DOMContentLoaded', () => {",
    "  const root = document.getElementById('dsl-root');",
    `  root.innerHTML = ${JSON.stringify(compiled.html)};`,
    '});'
  ].join('\n');

  const htmlContent = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '  <title>Animation DSL Output</title>',
    '  <link rel="stylesheet" href="./styles.css" />',
    '</head>',
    '<body>',
    '  <div id="dsl-root"></div>',
    '  <script src="./script.js"></script>',
    '</body>',
    '</html>'
  ].join('\n');

  fs.writeFileSync(cssPath, compiled.css);
  fs.writeFileSync(jsPath, scriptContent);
  fs.writeFileSync(htmlPath, htmlContent);

  return { htmlPath, cssPath, jsPath, resolvedOutputDir };
}

function readFromInteractiveStdin() {
  return new Promise((resolve) => {
    const chunks = [];

    if (typeof process !== 'undefined' && process.stdin && process.stdin.isTTY) {
      console.log('Paste your DSL input, then press Ctrl+D (Mac/Linux) or Ctrl+Z then Enter (Windows):');
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
  });
}

function printCompiledOutput(compiled) {
  if (typeof document !== 'undefined') {
    injectToDOM(compiled);
  } else {
    console.log('AST:', JSON.stringify(compiled.ast, null, 2));
    console.log('CSS\n', compiled.css);
    console.log('HTML\n', compiled.html);
  }
}

async function runCLI() {
  const fs = require('fs');
  const path = require('path');

  try {
    const argv = process.argv.slice(2);
    const input = getCLIInput(argv, fs);

    if (input.type === 'help') {
      return;
    }

    let dslInput = input.value;
    if (input.type === 'interactive') {
      dslInput = await readFromInteractiveStdin();
      if (!dslInput.trim()) {
        dslInput = getExampleDSL();
      }
    }

    const compiled = compileAnimationDSL(dslInput);

    const shouldWriteFiles = argv.includes('--files');
    const outputDir = getOptionValue(argv, '--outdir') || 'dsl-output';

    if (shouldWriteFiles) {
      const paths = writeOutputFiles(compiled, outputDir, fs, path);
      console.log(`Generated files in: ${paths.resolvedOutputDir}`);
      console.log(`- HTML: ${paths.htmlPath}`);
      console.log(`- CSS:  ${paths.cssPath}`);
      console.log(`- JS:   ${paths.jsPath}`);
      return;
    }

    printCompiledOutput(compiled);
  } catch (error) {
    console.error('Compilation error:', error.message);
    process.exitCode = 1;
  }
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  runCLI();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = animationDslCompilerAPI;
}

if (typeof globalThis !== 'undefined') {
  globalThis.AnimationDslCompiler = animationDslCompilerAPI;
}