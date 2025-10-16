import { ResourcePlaceholder } from '../../components/ResourcePlaceholder';

export default function CustomersPage() {
  return (
    <ResourcePlaceholder
      title="Customers"
      description="Manage customer contact details for Accounts Receivable."
      actions={['Create new customers', 'Archive inactive customers']}
    />
  );
}
