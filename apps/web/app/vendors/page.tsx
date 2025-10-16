import { ResourcePlaceholder } from '../../components/ResourcePlaceholder';

export default function VendorsPage() {
  return (
    <ResourcePlaceholder
      title="Vendors"
      description="Maintain vendor records for Accounts Payable workflows."
      actions={['Add vendors for upcoming bills', 'Archive vendors when no longer needed']}
    />
  );
}
