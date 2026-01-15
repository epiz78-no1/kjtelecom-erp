import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing keys");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log("🔍 Checking Supabase API...");

    // Check Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error("❌ Auth Error:", error);
    } else {
        console.log(`✅ Auth OK. Found ${users.length} users.`);
    }

    // Check Storage
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
        console.error("❌ Storage Error:", storageError);
    } else {
        console.log(`✅ Storage OK. Found ${buckets.length} buckets.`);
    }

    // Check DB via PostgREST (Table: users)
    const { data: dbData, error: dbError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

    if (dbError) {
        console.error("❌ PostgREST Error:", dbError);
    } else {
        console.log("✅ PostgREST OK:", dbData);
    }
}

main();
