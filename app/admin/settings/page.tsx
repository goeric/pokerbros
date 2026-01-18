import { getServerAuth } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/auth-helpers';
import SettingsClient from './page-client';

interface Setting {
  key: string;
  value: string | boolean;
  description: string;
}

export default async function SettingsPage() {
  const { user, isAdmin } = await getServerAuth();
  const supabase = await createSupabaseServerClient();

  // Fetch all settings
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .order('key');

  const settingsArray: Setting[] = (settings || []).map((s) => ({
    key: s.key,
    value: typeof s.value === 'string' ? s.value : s.value,
    description: s.description,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SettingsClient settings={settingsArray} user={user} isAdmin={isAdmin} />
    </div>
  );
}
