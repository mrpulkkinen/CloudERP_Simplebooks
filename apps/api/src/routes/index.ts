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
import { authRouter } from './auth.js';
import { requireAuth } from '../middleware/auth.js';

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

  app.use('/auth', authRouter);

  app.use('/customers', requireAuth, customersRouter);
  app.use('/vendors', requireAuth, vendorsRouter);
  app.use('/products', requireAuth, productsRouter);
  app.use('/tax-rates', requireAuth, taxRatesRouter);
  app.use('/sales-orders', requireAuth, notImplemented);
  app.use('/invoices', requireAuth, invoicesRouter);
  app.use('/bills', requireAuth, billsRouter);
  app.use('/payments', requireAuth, paymentsRouter);
  app.use('/journals', requireAuth, notImplemented);
  app.use('/ledger', requireAuth, ledgerRouter);
  app.use('/reports', requireAuth, reportsRouter);
  app.use('/accounts', requireAuth, accountsRouter);
}
