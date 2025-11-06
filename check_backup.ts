import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBackupData() {
  console.log('🔍 Checking Supabase backup for Nov 5th data...\n');
  
  // Query Supabase backup database for Nov 5th entries
  const { data, error } = await supabase
    .from('hercm_weeks')
    .select('*')
    .eq('user_id', 'komalsiddharth814@gmail.com')
    .eq('date_string', '2025-11-05')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error querying backup:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No Nov 5th data found in backup');
    return;
  }
  
  console.log(`✅ Found ${data.length} entries for Nov 5th in backup\n`);
  
  data.forEach((entry: any, index: number) => {
    console.log(`\n📊 Entry ${index + 1}:`);
    console.log(`Week: ${entry.week_number}`);
    console.log(`Created: ${entry.created_at}`);
    console.log(`Updated: ${entry.updated_at}`);
    console.log(`\n📝 Text Fields:`);
    console.log(`Health Problems: "${entry.health_problems || 'BLANK'}"`);
    console.log(`Health Feelings: "${entry.health_current_feelings || 'BLANK'}"`);
    console.log(`Health Actions: "${entry.health_current_actions || 'BLANK'}"`);
    console.log(`Relationship Problems: "${entry.relationship_problems || 'BLANK'}"`);
    console.log(`Career Problems: "${entry.career_problems || 'BLANK'}"`);
    console.log(`Money Problems: "${entry.money_problems || 'BLANK'}"`);
    console.log(`\n📊 Ratings:`);
    console.log(`Health: ${entry.current_h} → ${entry.target_h}`);
    console.log(`Relationship: ${entry.current_e} → ${entry.target_e}`);
    console.log(`Career: ${entry.current_r} → ${entry.target_r}`);
    console.log(`Money: ${entry.current_c} → ${entry.target_c}`);
  });
  
  // Also check for entries created on Nov 5th (even if date_string is different)
  console.log('\n\n🔍 Checking for ANY entries created on Nov 5th...\n');
  
  const { data: createdOnNov5, error: error2 } = await supabase
    .from('hercm_weeks')
    .select('*')
    .eq('user_id', 'komalsiddharth814@gmail.com')
    .gte('created_at', '2025-11-05T00:00:00')
    .lte('created_at', '2025-11-05T23:59:59')
    .order('created_at', { ascending: false });
  
  if (error2) {
    console.error('❌ Error:', error2);
    return;
  }
  
  if (!createdOnNov5 || createdOnNov5.length === 0) {
    console.log('❌ No entries created on Nov 5th found in backup');
  } else {
    console.log(`✅ Found ${createdOnNov5.length} entries created on Nov 5th`);
    createdOnNov5.forEach((entry: any) => {
      console.log(`\n- Week ${entry.week_number}, date_string: ${entry.date_string}`);
      console.log(`  Health Problems: "${entry.health_problems || 'BLANK'}"`);
      console.log(`  Relationship Problems: "${entry.relationship_problems || 'BLANK'}"`);
    });
  }
}

checkBackupData().catch(console.error);
