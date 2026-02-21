const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Wynton0309%218@db.qvoozieplmvripvbchvs.supabase.co:5432/postgres';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const migrationPath = path.join(__dirname, '../supabase/migrations/003_vapi_phone_assistant.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 003_vapi_phone_assistant.sql');
    await client.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
