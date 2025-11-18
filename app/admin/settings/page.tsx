import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerAuth } from '@/lib/auth-server';
import SettingsClient from './page-client';

interface Setting {
  key: string;
  value: string | boolean;
  description: string;
}

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const { user, isAdmin } = await getServerAuth();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

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
