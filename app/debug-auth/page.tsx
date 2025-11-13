'use client';

import { useAuth } from '@/lib/auth-context';
import Card from '@/components/Card';

export default function DebugAuthPage() {
  const { user, adminUser, isAdmin, isSuperAdmin, loading } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <h1 className="text-2xl font-bold text-white mb-6">Auth Debug Info</h1>

        <div className="space-y-4 text-white">
          <div>
            <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
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
            <strong>Admin User Found:</strong> {adminUser ? 'Yes' : 'No'}
          </div>

          {adminUser && (
            <>
              <div>
                <strong>Admin Email:</strong> {adminUser.email}
              </div>
              <div>
                <strong>Is Superadmin:</strong> {adminUser.is_superadmin ? 'Yes' : 'No'}
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
              {JSON.stringify({ user, adminUser, isAdmin, isSuperAdmin }, null, 2)}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
