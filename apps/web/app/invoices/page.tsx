import { ResourcePlaceholder } from '../../components/ResourcePlaceholder';

export default function InvoicesPage() {
  return (
    <ResourcePlaceholder
      title="Invoices"
      description="Issued invoices will appear here once the API endpoints are implemented."
      actions={['Issue invoices from sales orders', 'Record payments to close balances']}
    />
  );
}
