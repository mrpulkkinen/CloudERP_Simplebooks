interface ResourcePlaceholderProps {
  title: string;
  description: string;
  actions?: string[];
}

export function ResourcePlaceholder({ title, description, actions }: ResourcePlaceholderProps) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p>{description}</p>
      {actions && actions.length > 0 && (
        <ul>
          {actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
