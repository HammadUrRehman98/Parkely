const pkrFormatter = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0,
});

export function formatPKR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return pkrFormatter.format(safe);
}

