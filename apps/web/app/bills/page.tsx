import { ResourcePlaceholder } from '../../components/ResourcePlaceholder';

export default function BillsPage() {
  return (
    <ResourcePlaceholder
      title="Bills"
      description="Track vendor bills and approval status here."
      actions={['Approve bills to post expenses', 'Record vendor payments to update AP']}
    />
  );
}
