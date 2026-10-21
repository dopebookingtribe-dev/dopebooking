import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import {
  listRolePermissions,
  listUsersForAdmin,
} from "@/modules/admin/queries";
import { RoleForm } from "@/modules/admin/role-form";
import { ROLE_LABELS } from "@/modules/admin/roles";

export const metadata: Metadata = { title: "Users and roles" };

export default function UsersPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Users and roles" />
      <p className="mt-4 max-w-2xl text-muted">
        Signing up never grants admin access. Roles are added here by a super
        admin, and every change is written to the audit log.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading users…</p>}>
        <Users />
      </Suspense>
    </Container>
  );
}

async function Users() {
  const { user: me } = await requirePermission("users.manage", "/admin/users");
  const [users, permissions] = await Promise.all([
    listUsersForAdmin(),
    listRolePermissions(),
  ]);
  const byRole = new Map<string, string[]>();
  for (const row of permissions) {
    byRole.set(row.role, [...(byRole.get(row.role) ?? []), row.permission]);
  }
  return (
    <>
      <div className="mt-10 overflow-x-auto rounded-(--radius) border border-line">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-surface-1 font-label text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-normal">
                User
              </th>
              <th scope="col" className="px-4 py-3 font-normal">
                Joined
              </th>
              <th scope="col" className="px-4 py-3 font-normal">
                Roles
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => (
              <tr key={user.id} className="align-top">
                <td className="px-4 py-4">
                  <span className="block font-semibold">
                    {user.name ?? "No name"}
                  </span>
                  <span className="block text-muted">
                    {user.email ?? `${user.id.slice(0, 8)}…`}
                  </span>
                </td>
                <td className="px-4 py-4 text-muted">
                  {new Date(user.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-4">
                  <RoleForm
                    userId={user.id}
                    roles={user.roles}
                    isSelf={user.id === me.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="perm-heading" className="mt-16">
        <h2 id="perm-heading" className="font-display text-2xl">
          What each role can do
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Permissions live in the database (role_permissions) and are checked on
          the server and in database policies. Sellers, artists and providers
          get access only to their own records.
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {[...byRole.entries()].map(([role, perms]) => (
            <div
              key={role}
              className="rounded-(--radius) border border-line p-4"
            >
              <dt className="font-semibold">{ROLE_LABELS[role] ?? role}</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {perms.map((perm) => (
                  <span
                    key={perm}
                    className="rounded-full border border-line-strong px-2 font-label text-xs text-muted"
                  >
                    {perm}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
