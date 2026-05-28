const currencyFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return "₹0";
  }
  return `₹${currencyFormatter.format(amount)}`;
};

export default formatCurrency;
