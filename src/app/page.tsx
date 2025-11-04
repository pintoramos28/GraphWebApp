import EncodingWorkspace from '@/components/EncodingWorkspace';

const HomePage = () => (
  <section className="chart-card" aria-labelledby="sample-chart-heading">
    <div>
      <h2 id="sample-chart-heading" className="chart-card__title">
        Sample Scatter
      </h2>
      <p>
        Explore how data will render in the Vega-Lite harness. Drag fields onto shelves to assign axes and encodings.
      </p>
    </div>
    <EncodingWorkspace />
  </section>
);

export default HomePage;
