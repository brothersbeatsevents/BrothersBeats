'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { adminGetAdminUsers, adminInviteAdminUser, adminUpdateAdminUser } from '@/lib/api';

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN' });
  const [error, setError] = useState('');

  function load() {
    if (!token) return;
    adminGetAdminUsers(token).then((res) => setUsers(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, [token]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    try {
      await adminInviteAdminUser(inviteForm, token);
      setShowInvite(false);
      setInviteForm({ email: '', name: '', role: 'ADMIN' });
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to invite user.');
    }
  }

  async function toggleDisabled(u: any) {
    if (!token) return;
    await adminUpdateAdminUser(u.id, { disabled: !u.disabled }, token);
    load();
  }

  async function changeRole(u: any, role: string) {
    if (!token) return;
    await adminUpdateAdminUser(u.id, { role }, token);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-bb-text">Admin users</h1>
        <button onClick={() => setShowInvite((v) => !v)} className="bg-bb-orange hover:bg-bb-orange-dark text-white font-semibold px-5 py-2.5 rounded-full transition-colors text-sm">
          {showInvite ? 'Cancel' : '+ Invite admin'}
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="grid grid-cols-3 gap-3 mb-6 bg-bb-surface border border-bb-border rounded-2xl p-4">
          <input required placeholder="Name" value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} className="rounded-lg border border-bb-border px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} className="rounded-lg border border-bb-border px-3 py-2 text-sm" />
          <select value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as any }))} className="rounded-lg border border-bb-border px-3 py-2 text-sm">
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </select>
          {error && <p className="col-span-3 text-sm text-bb-red">{error}</p>}
          <button type="submit" className="col-span-3 bg-bb-green hover:bg-bb-green-dark text-white font-semibold py-2 rounded-full text-sm transition-colors">
            Send invite
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-bb-text-secondary">Loading…</p>
      ) : (
        <div className="bg-bb-surface border border-bb-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bb-neutral text-bb-text-secondary text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-bb-border">
                  <td className="px-4 py-2 text-bb-text">{u.display_name}</td>
                  <td className="px-4 py-2 text-bb-text-secondary">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser?.id}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="text-xs rounded-lg border border-bb-border px-2 py-1 disabled:bg-bb-neutral"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-xs">{u.disabled ? 'Disabled' : 'Active'}</td>
                  <td className="px-4 py-2">
                    {u.id !== currentUser?.id && (
                      <button onClick={() => toggleDisabled(u)} className="text-xs font-semibold text-bb-red hover:underline">
                        {u.disabled ? 'Enable' : 'Disable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
