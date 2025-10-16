export function formatDKK(ore: number): string {
  const kroner = ore / 100;
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK'
  }).format(kroner);
}
