import { getServerAuth } from '@/lib/auth-server';
import Card from '@/components/Card';

export default async function DebugAuthPage() {
  // Fetch auth state server-side
  const { user, isAdmin, isSuperAdmin } = await getServerAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <h1 className="text-2xl font-bold text-white mb-6">Auth Debug Info</h1>

        <div className="space-y-4 text-white">
          <div>
            <strong>Rendering Mode:</strong> Server Component (SSR)
          </div>

          <div>
            <strong>User Logged In:</strong> {user ? 'Yes' : 'No'}
          </div>

          {user && (
            <>
              <div>
                <strong>User ID:</strong> {user.id}
              </div>
              <div>
                <strong>User Email:</strong> {user.email}
              </div>
            </>
          )}

          <div>
            <strong>isAdmin Status:</strong> {isAdmin ? 'Yes' : 'No'}
          </div>

          <div>
            <strong>isSuperAdmin Status:</strong> {isSuperAdmin ? 'Yes' : 'No'}
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded">
            <strong>Raw Data:</strong>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify({ user, isAdmin, isSuperAdmin }, null, 2)}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
