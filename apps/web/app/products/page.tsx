import { ResourcePlaceholder } from '../../components/ResourcePlaceholder';

export default function ProductsPage() {
  return (
    <ResourcePlaceholder
      title="Products & Services"
      description="Create catalog items to reuse on sales orders and invoices."
      actions={['Configure income accounts for new items', 'Attach tax rates where applicable']}
    />
  );
}
