import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'Telegram Shop Admin API',
    status: 'online',
    endpoints: [
      { path: '/api/admin/products', methods: ['GET', 'POST', 'PUT'] },
      { path: '/api/admin/stock/import', methods: ['POST'] },
      { path: '/api/admin/notify-restock', methods: ['POST'] },
      { path: '/api/admin/orders', methods: ['GET'] },
      { path: '/api/admin/logout', methods: ['POST'] },
    ],
    dashboardUrl: '/admin',
  });
}
