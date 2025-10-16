import { Application, Request, Response } from 'express';

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

  app.use('/customers', notImplemented);
  app.use('/vendors', notImplemented);
  app.use('/products', notImplemented);
  app.use('/tax-rates', notImplemented);
  app.use('/sales-orders', notImplemented);
  app.use('/invoices', notImplemented);
  app.use('/bills', notImplemented);
  app.use('/payments', notImplemented);
  app.use('/journals', notImplemented);
  app.use('/ledger', notImplemented);
  app.use('/reports', notImplemented);
}
