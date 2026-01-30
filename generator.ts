import { ActorAST, CompilerOutput, KeyframeProperty } from './types';

export class Generator {
  generate(ast: ActorAST[]): CompilerOutput {
    let css = '';
    const errors: string[] = [];

    ast.forEach(actor => {
        if (actor.duration === 0) {
            errors.push(`Warning: Actor ${actor.name} has 0 duration.`);
            return;
        }

        const keyframeName = `anim-${actor.name}`;
        
        // Generate @keyframes
        let keyframesBlock = `@keyframes ${keyframeName} {\n`;
        
        actor.keyframes.forEach(kf => {
            const percentage = (kf.timeInMs / actor.duration) * 100;
            // Group transform properties
            const transforms: string[] = [];
            const otherStyles: string[] = [];

            kf.properties.forEach(p => {
                const mapped = this.mapProperty(p);
                if (mapped.type === 'transform') {
                    transforms.push(mapped.value);
                } else {
                    otherStyles.push(`${mapped.prop}: ${mapped.value};`);
                }
            });

            if (transforms.length > 0) {
                otherStyles.push(`transform: ${transforms.join(' ')};`);
            }

            // Ensure percentage is valid CSS (e.g., 0% not 0)
            keyframesBlock += `  ${percentage.toFixed(2)}% { ${otherStyles.join(' ')} }\n`;
        });
        
        keyframesBlock += `}\n`;
        css += keyframesBlock;

        // Generate Utility Class
        // We use an ID selector or specific class selector that users can attach
        const animDuration = `${actor.duration}ms`;
        const iteration = actor.loop ? 'infinite' : '1';
        // linear timing for simplicity in this MVP, could be configurable
        const rule = `.${actor.name} { animation: ${keyframeName} ${animDuration} linear ${iteration} forwards; }\n`; 
        css += rule;
    });

    return {
        css,
        ast,
        errors
    };
  }

  private mapProperty(p: KeyframeProperty): { type: 'style' | 'transform', prop: string, value: string } {
      switch(p.name) {
          case 'x': return { type: 'transform', prop: 'transform', value: `translateX(${p.value})` };
          case 'y': return { type: 'transform', prop: 'transform', value: `translateY(${p.value})` };
          case 'scale': return { type: 'transform', prop: 'transform', value: `scale(${p.value})` };
          case 'rotate': return { type: 'transform', prop: 'transform', value: `rotate(${p.value})` };
          case 'opacity': return { type: 'style', prop: 'opacity', value: p.value };
          case 'bg': return { type: 'style', prop: 'background-color', value: p.value };
          case 'color': return { type: 'style', prop: 'color', value: p.value };
          case 'width': return { type: 'style', prop: 'width', value: p.value };
          case 'height': return { type: 'style', prop: 'height', value: p.value };
          case 'border-radius': return { type: 'style', prop: 'border-radius', value: p.value };
          default: return { type: 'style', prop: p.name, value: p.value };
      }
  }
}