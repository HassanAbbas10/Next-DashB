import { Pool } from '@neondatabase/serverless';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Add your Neon database connection string here
  ssl: { rejectUnauthorized: false }, // Ensure SSL is enabled
});

async function listInvoices() {
	const data = await pool.query(`
    SELECT invoices.amount, customers.name
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.amount = 666;
  `)

	return data.rows;
}

export async function GET() {
 
  try {
  	return Response.json(await listInvoices());
  } catch (error) {
  	return Response.json({ error }, { status: 500 });
  }
}
