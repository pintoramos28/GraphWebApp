import type { TopLevelSpec } from 'vega-lite';
import VegaLiteChart from '@/components/VegaLiteChart';

const sampleScatterSpec: TopLevelSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  description: 'Sample scatter plot demonstrating the Vega-Lite harness.',
  width: 'container',
  height: 360,
  data: {
    values: [
      { sprint: 'Alpha', defects: 4, hours: 120, team: 'Aurora' },
      { sprint: 'Beta', defects: 7, hours: 150, team: 'Aurora' },
      { sprint: 'Gamma', defects: 3, hours: 110, team: 'Aurora' },
      { sprint: 'Alpha', defects: 6, hours: 118, team: 'Nimbus' },
      { sprint: 'Beta', defects: 8, hours: 170, team: 'Nimbus' },
      { sprint: 'Gamma', defects: 5, hours: 140, team: 'Nimbus' },
      { sprint: 'Alpha', defects: 2, hours: 90, team: 'Zenith' },
      { sprint: 'Beta', defects: 4, hours: 105, team: 'Zenith' },
      { sprint: 'Gamma', defects: 3, hours: 112, team: 'Zenith' }
    ]
  },
  mark: { type: 'point', filled: true, tooltip: true },
  encoding: {
    x: {
      field: 'hours',
      type: 'quantitative',
      title: 'Engineering Hours',
      axis: { tickCount: 5 }
    },
    y: {
      field: 'defects',
      type: 'quantitative',
      title: 'Defects Found'
    },
    color: {
      field: 'team',
      type: 'nominal',
      title: 'Team',
      scale: { scheme: 'tableau10' },
      legend: { title: 'Team', orient: 'right' }
    },
    shape: { field: 'team', type: 'nominal' },
    tooltip: [
      { field: 'team', type: 'nominal', title: 'Team' },
      { field: 'sprint', type: 'nominal', title: 'Sprint' },
      { field: 'hours', type: 'quantitative', title: 'Hours' },
      { field: 'defects', type: 'quantitative', title: 'Defects' }
    ]
  },
  config: {
    background: '#ffffff',
    point: { size: 120 },
    axis: {
      labelFontSize: 12,
      titleFontSize: 13
    },
    legend: {
      labelFontSize: 12,
      titleFontSize: 13
    }
  }
};

const HomePage = () => (
  <section className="chart-card" aria-labelledby="sample-chart-heading">
    <div>
      <h2 id="sample-chart-heading" className="chart-card__title">
        Sample Scatter
      </h2>
      <p>
        Explore how data will render in the Vega-Lite harness. Interactivity and bindings will be
        wired to shelves in later phases.
      </p>
    </div>
    <div className="chart-card__content" data-testid="sample-scatter">
      <VegaLiteChart
        spec={sampleScatterSpec}
        aria-label="Sample scatter plot showing defects versus engineering hours by team"
      />
    </div>
  </section>
);

export default HomePage;
