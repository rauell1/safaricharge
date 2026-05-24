const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
console.log('Reading env from:', envPath);
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local not found at', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY in env');
  process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function clearAllAccounts() {
  console.log('Fetching users from Supabase Auth...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Failed to list users:', error.message);
    process.exit(1);
  }
  
  console.log(`Found ${users.length} saved accounts in the database.`);
  if (users.length === 0) {
    console.log('No user accounts to clear.');
    return;
  }
  
  for (const user of users) {
    console.log(`Deleting user: ${user.email} (ID: ${user.id})...`);
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      console.error(`Failed to delete user ${user.email}:`, deleteErr.message);
    } else {
      console.log(`Successfully deleted ${user.email}.`);
    }
  }
  
  console.log('All user accounts successfully cleared from the database.');
}

clearAllAccounts().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
