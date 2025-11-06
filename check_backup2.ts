import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBackupData() {
  console.log('🔍 Checking Supabase backup for Nov 5th data (using created_at)...\n');
  
  // Query by created_at instead of date_string
  const { data, error } = await supabase
    .from('hercm_weeks')
    .select('id, week_number, user_id, health_problems, health_current_feelings, health_current_actions, relationship_problems, career_problems, money_problems, current_h, target_h, current_e, target_e, created_at, updated_at')
    .eq('user_id', 'komalsiddharth814@gmail.com')
    .gte('created_at', '2025-11-05T00:00:00')
    .lte('created_at', '2025-11-06T23:59:59')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error querying backup:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No data found in backup for Nov 5-6');
    return;
  }
  
  console.log(`✅ Found ${data.length} entries in backup\n`);
  
  data.forEach((entry: any, index: number) => {
    console.log(`\n📊 Entry ${index + 1} (ID: ${entry.id}):`);
    console.log(`Week: ${entry.week_number}`);
    console.log(`Created: ${entry.created_at}`);
    console.log(`Updated: ${entry.updated_at}`);
    console.log(`\n📝 TEXT FIELDS:`);
    console.log(`Health Problems: "${entry.health_problems || 'BLANK'}"`);
    console.log(`Health Feelings: "${entry.health_current_feelings || 'BLANK'}"`);
    console.log(`Health Actions: "${entry.health_current_actions || 'BLANK'}"`);
    console.log(`Relationship Problems: "${entry.relationship_problems || 'BLANK'}"`);
    console.log(`Career Problems: "${entry.career_problems || 'BLANK'}"`);
    console.log(`Money Problems: "${entry.money_problems || 'BLANK'}"`);
    console.log(`\n📊 Ratings:`);
    console.log(`Health: ${entry.current_h} → ${entry.target_h}`);
    console.log(`Relationship: ${entry.current_e} → ${entry.target_e}`);
  });
}

checkBackupData().catch(console.error);
