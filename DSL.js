function parseDSL(input) {
  const lines = input
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  let i = 0;
  const next = () => lines[i++];

  const header = next().split(" ");
  const name = header[1];

  next();

  const durationLine = next().split(" ");
  const duration = parseFloat(durationLine[1]);

  const rules = [];

  while (!lines[i].startsWith("}")) {
    const parts = next().split(" ");
    rules.push({
      property: parts[0],
      from: parseFloat(parts[1]),
      to: parseFloat(parts[3]),
      over: parseFloat(parts[5]),
      easing: parts[6] || "linear"
    });
  }

  return { name, duration, rules };
}

function cssProperty(prop, value) {
  if (prop === "opacity") return `opacity: ${value}`;
  if (prop === "translateX") return `transform: translateX(${value}px)`;
  throw new Error("Unknown property");
}

function generateCSS(ast) {
  const keyframes = {};

  ast.rules.forEach(rule => {
    const startPct = 0;
    const endPct = (rule.over / ast.duration) * 100;

    keyframes[startPct] = keyframes[startPct] || [];
    keyframes[endPct] = keyframes[endPct] || [];

    keyframes[startPct].push(cssProperty(rule.property, rule.from));
    keyframes[endPct].push(cssProperty(rule.property, rule.to));
  });

  let css = `@keyframes ${ast.name} {\n`;

  Object.keys(keyframes)
    .sort((a, b) => a - b)
    .forEach(pct => {
      css += `  ${pct}% {\n`;
      keyframes[pct].forEach(line => {
        css += `    ${line};\n`;
      });
      css += `  }\n`;
    });

  css += `}`;

  return css;
}

const dsl = `
animation fadeMove {
  duration 2s
  opacity 0 -> 1 over 2s
  translateX 0 -> 100 over 2s
}
`;

const ast = parseDSL(dsl);
const css = generateCSS(ast);
console.log(css);
