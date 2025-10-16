import { ResourcePlaceholder } from '../../components/ResourcePlaceholder';

export default function LedgerPage() {
  return (
    <ResourcePlaceholder
      title="General Ledger"
      description="Ledger activity will be displayed once journal postings are wired up."
      actions={['Review journal entries for accuracy', 'Export ledger data for accountants']}
    />
  );
}
