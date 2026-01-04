import { Application, Request, Response } from 'express';

import { customersRouter } from './customers.js';
import { invoicesRouter } from './invoices.js';
import { vendorsRouter } from './vendors.js';
import { billsRouter } from './bills.js';
import { paymentsRouter } from './payments.js';
import { ledgerRouter } from './ledger.js';
import { reportsRouter } from './reports.js';
import { taxRatesRouter } from './tax-rates.js';
import { productsRouter } from './products.js';
import { accountsRouter } from './accounts.js';

export function registerRoutes(app: Application) {
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'CloudERP Simplebooks API',
      version: '0.1.0',
      docs: '/docs',
      resources: {
        customers: '/customers',
        vendors: '/vendors',
        products: '/products',
        invoices: '/invoices',
        bills: '/bills',
        payments: '/payments'
      }
    });
  });

  const notImplemented = (_req: Request, res: Response) => {
    res.status(501).json({ error: { code: 'not_implemented', message: 'Coming soon' } });
  };

  app.use('/customers', customersRouter);
  app.use('/vendors', vendorsRouter);
  app.use('/products', productsRouter);
  app.use('/tax-rates', taxRatesRouter);
  app.use('/sales-orders', notImplemented);
  app.use('/invoices', invoicesRouter);
  app.use('/bills', billsRouter);
  app.use('/payments', paymentsRouter);
  app.use('/journals', notImplemented);
  app.use('/ledger', ledgerRouter);
  app.use('/reports', reportsRouter);
  app.use('/accounts', accountsRouter);
}
