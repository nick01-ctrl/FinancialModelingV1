import { useModelStore } from '../../../stores/modelStore';
import { useCalculationWorker } from '../../../engine/useCalculationWorker';
import UFCFTable from './UFCFTable';
import ValuationSummary from './ValuationSummary';
import SensitivityPanel from './SensitivityPanel';
import TornadoPanel from './TornadoPanel';
import FootballFieldPanel from './FootballFieldPanel';

export default function DCFOutputPanel() {
  const inputs = useModelStore((s) => s.dcfInputs);
  const { outputs, sensitivityTable, tornadoData, footballFieldData, isCalculating } =
    useCalculationWorker(inputs);

  return (
    <div className="dcf-output-panel">
      {isCalculating && (
        <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
          Calculating...
        </div>
      )}

      {outputs?.error && (
        <div className="model-error">{outputs.error}</div>
      )}

      {outputs && !outputs.error && (
        <>
          <ValuationSummary outputs={outputs} method={inputs.terminalValueMethod} netDebt={inputs.netDebt} />
          <UFCFTable outputs={outputs} />
          {footballFieldData.length > 0 && <FootballFieldPanel data={footballFieldData} />}
          {sensitivityTable && <SensitivityPanel table={sensitivityTable} />}
          {tornadoData.length > 0 && <TornadoPanel data={tornadoData} />}
        </>
      )}

      {!outputs && !isCalculating && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Enter inputs to see model outputs
        </div>
      )}
    </div>
  );
}
