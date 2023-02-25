import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import fs from 'fs';

const COLORS: { [key: string]: string } = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  SCSS: '#c6538c',
  Svelte: '#ff3e00',
  Python: '#3572a5',
  Go: '#00add8',
  Shell: '#89e051',
  PHP: '#4f5d95',
  Vue: '#41b883',
  Rust: '#dea584',
} as const;

export async function renderLangChart(languages: { [k: string]: number }) {
  const width = 320;
  const height = 320;

  const backgroundColour = 'rgba(255,255,255,0)';
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour,
  });

  const backgroundColor = Object.keys(languages).map((key) => COLORS[key]);

  const image = await chartJSNodeCanvas.renderToBuffer({
    type: 'pie',
    data: {
      labels: Object.keys(languages),
      datasets: [
        {
          data: Object.values(languages),
          backgroundColor,
          borderWidth: 0,
        },
      ],
    },
    options: {},
    plugins: [],
  });

  fs.writeFileSync('chart.png', image);
  console.log(image);
}
