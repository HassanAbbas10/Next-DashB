import bcrypt from 'bcrypt';
import { Pool } from '@neondatabase/serverless';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Add your Neon database connection string here
  ssl: { rejectUnauthorized: false }, // Ensure SSL is enabled
});

async function seedUsers(pool) {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `);

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return pool.query(
        `INSERT INTO users (id, name, email, password)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING;`,
        [user.id, user.name, user.email, hashedPassword]
      );
    })
  );

  return insertedUsers;
}

async function seedInvoices(pool) {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `);

  const insertedInvoices = await Promise.all(
    invoices.map((invoice) =>
      pool.query(
        `INSERT INTO invoices (customer_id, amount, status, date)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING;`,
        [invoice.customer_id, invoice.amount, invoice.status, invoice.date]
      )
    )
  );

  return insertedInvoices;
}

async function seedCustomers(pool) {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `);

  const insertedCustomers = await Promise.all(
    customers.map((customer) =>
      pool.query(
        `INSERT INTO customers (id, name, email, image_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING;`,
        [customer.id, customer.name, customer.email, customer.image_url]
      )
    )
  );

  return insertedCustomers;
}

async function seedRevenue(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `);

  const insertedRevenue = await Promise.all(
    revenue.map((rev) =>
      pool.query(
        `INSERT INTO revenue (month, revenue)
         VALUES ($1, $2)
         ON CONFLICT (month) DO NOTHING;`,
        [rev.month, rev.revenue]
      )
    )
  );

  return insertedRevenue;
}

export async function GET() {
  const client = await pool.connect(); // Acquire a client from the pool

  try {
    await client.query('BEGIN');
    await seedUsers(pool);
    await seedCustomers(pool);
    await seedInvoices(pool);
    await seedRevenue(pool);
    await client.query('COMMIT');

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during seeding:', error);
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    client.release(); // Release the client back to the pool
  }
}
