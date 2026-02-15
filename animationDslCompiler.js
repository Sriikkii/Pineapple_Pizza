/**
 * Animation DSL Compiler (Pure ES6)
 * - Tokenizer
 * - Recursive descent parser -> AST
 * - Code generator (HTML + CSS)
 * - Injects generated CSS into DOM
 */

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
      // no-op guard for extensibility
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

    cssBlocks.push(this.sceneCSS(scene.name));

    for (const obj of scene.objects) {
      const className = `${scene.name}-${obj.name}`;
      const keyframesName = `${className}-kf`;
      const animationCSS = this.objectCSS(className, keyframesName, obj);
      const keyframesCSS = this.keyframesCSS(keyframesName, obj);
      cssBlocks.push(animationCSS, keyframesCSS);
      objectHtml.push(`<div class="dsl-object ${className}"></div>`);
    }

    const html = `<div class="dsl-scene ${scene.name}">${objectHtml.join('')}</div>`;
    const css = cssBlocks.join('\n\n');

    return { html, css };
  }

  sceneCSS(sceneName) {
    return [
      `.dsl-scene.${sceneName} {`,
      `  position: relative;`,
      `  width: 100%;`,
      `  height: 300px;`,
      `  overflow: hidden;`,
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

  keyframesCSS(name, obj) {
    const durationSeconds = this.toSeconds(obj.properties.time || '1s');
    const stateByTime = this.buildAccumulatedState(obj.timeline);
    const times = Array.from(stateByTime.keys()).sort((a, b) => a - b);

    const lines = [`@keyframes ${name} {`];

    for (const t of times) {
      const pct = durationSeconds > 0 ? (t / durationSeconds) * 100 : 0;
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

  shapeStyles(shape = 'square', size = '50px', color = 'black') {
    if (shape === 'circle') {
      return `width: ${size}; height: ${size}; background: ${color}; border-radius: 50%;`;
    }

    if (shape === 'wave') {
      return `width: ${size}; height: calc(${size} / 2); background: ${color}; border-radius: 40% 60% 50% 50%;`;
    }

    return `width: ${size}; height: ${size}; background: ${color};`;
  }

  toSeconds(timeLiteral) {
    const m = /^([0-9]*\.?[0-9]+)(ms|s)$/.exec(String(timeLiteral).trim());
    if (!m) throw new Error(`Invalid time literal: ${timeLiteral}`);
    const value = parseFloat(m[1]);
    const unit = m[2];
    return unit === 'ms' ? value / 1000 : value;
  }

  parseNumeric(valueLiteral) {
    const n = parseFloat(String(valueLiteral).replace(/[^0-9.+\-]/g, ''));
    if (Number.isNaN(n)) throw new Error(`Invalid numeric value: ${valueLiteral}`);
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

// Example usage when run directly:
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  runCLI();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = animationDslCompilerAPI;
}

if (typeof globalThis !== 'undefined') {
  globalThis.AnimationDslCompiler = animationDslCompilerAPI;
}
