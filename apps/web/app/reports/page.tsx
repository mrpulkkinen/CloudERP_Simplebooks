import { ResourcePlaceholder } from '../../components/ResourcePlaceholder';

export default function ReportsPage() {
  return (
    <ResourcePlaceholder
      title="Reports"
      description="Trial balance and aging reports will live here."
      actions={['Run trial balance as of a date', 'Review AR/AP aging buckets']}
    />
  );
}
