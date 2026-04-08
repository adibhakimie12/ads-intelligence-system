const getCurrencyPrefix = (currency) => {
  switch (currency) {
    case 'USD':
      return '$';
    case 'GBP':
      return 'GBP ';
    case 'MYR':
    default:
      return 'RM ';
  }
};

export const formatCurrencyValue = (value, currency) => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

  return `${getCurrencyPrefix(currency)}${formatted}`;
};
