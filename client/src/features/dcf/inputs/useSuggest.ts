import { useAISuggest } from '../../../api/ai';
import { useModelStore } from '../../../stores/modelStore';
import type { DCFInputs } from '../../../engine/types';

export function useSuggestField() {
  const suggest = useAISuggest();
  const inputs = useModelStore((s) => s.dcfInputs);
  const setDCFInput = useModelStore((s) => s.setDCFInput);
  const markAIField = useModelStore((s) => s.markAIField);

  const suggestField = (field: keyof DCFInputs) => {
    suggest.mutate(
      {
        field,
        context: {
          companyName: inputs.companyName,
          companyDescription: inputs.companyDescription,
          sector: inputs.sector,
        },
      },
      {
        onSuccess: (result) => {
          setDCFInput(field, result.value as never);
          markAIField(field);
        },
      }
    );
  };

  return { suggestField, isPending: suggest.isPending };
}
