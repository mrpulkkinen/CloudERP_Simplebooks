export function requireTaxRate(state, taxRateId) {
  const rate = state.taxRates.find((item) => item.id === taxRateId);
  if (!rate) {
    throw new Error(`Tax rate ${taxRateId} not found`);
  }
  return rate;
}

export function requireProduct(state, productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }
  return product;
}

export function requireAccount(state, accountId) {
  const account = state.accounts.find((item) => item.id === accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }
  return account;
}

export function requireCustomer(state, customerId) {
  const customer = state.customers.find((item) => item.id === customerId);
  if (!customer) {
    throw new Error(`Customer ${customerId} not found`);
  }
  return customer;
}

export function requireVendor(state, vendorId) {
  const vendor = state.vendors.find((item) => item.id === vendorId);
  if (!vendor) {
    throw new Error(`Vendor ${vendorId} not found`);
  }
  return vendor;
}
