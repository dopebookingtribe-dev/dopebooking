import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import {
  listRolePermissions,
  listUsersForAdmin,
} from "@/modules/admin/queries";
import { PermissionMatrix } from "@/modules/admin/permission-matrix";
import { RoleForm } from "@/modules/admin/role-form";
import { ROLE_LABELS } from "@/modules/admin/roles";

export const metadata: Metadata = { title: "Users & permissions" };

export default function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <Container className="py-12">
      <AdminHeader title="Users & permissions" />
      <p className="mt-4 max-w-2xl text-muted">
        Signing up never grants admin access. Roles are added here by a super
        admin, and every change is written to the audit log.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading users…</p>}>
        <Users searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Users({
  searchParams,
}: {
  searchParams: PageProps<"/admin/users">["searchParams"];
}) {
  const { user: me } = await requirePermission("users.manage", "/admin/users");
  const [all, permissions, params] = await Promise.all([
    listUsersForAdmin(),
    listRolePermissions(),
    searchParams,
  ]);
  const q =
    typeof params.q === "string"
      ? params.q.trim().toLowerCase().slice(0, 80)
      : "";
  const roleFilter = typeof params.role === "string" ? params.role : "";
  const users = all.filter(
    (user) =>
      (!q ||
        `${user.name ?? ""} ${user.email ?? ""}`.toLowerCase().includes(q)) &&
      (!roleFilter ||
        (roleFilter === "none"
          ? !user.roles.length
          : user.roles.includes(roleFilter as never))),
  );
  const byRole = new Map<string, string[]>();
  for (const row of permissions) {
    byRole.set(row.role, [...(byRole.get(row.role) ?? []), row.permission]);
  }
  return (
    <>
      <form
        method="get"
        role="search"
        className="mt-8 grid gap-3 rounded-(--radius) border border-line bg-surface-1 p-4 sm:grid-cols-[2fr_1fr_auto]"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name or email"
            className="min-h-11 rounded-lg border border-line-strong bg-bg px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Role</span>
          <select
            name="role"
            defaultValue={roleFilter}
            className="min-h-11 rounded-lg border border-line-strong bg-bg px-3"
          >
            <option value="">Any</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
            <option value="none">No role</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-11 rounded-full border border-line-strong px-5 text-sm hover:border-accent hover:text-accent"
          >
            Apply
          </button>
        </div>
      </form>
      <p className="mt-4 font-label text-sm text-muted">
        {users.length} of {all.length}{" "}
        {all.length === 1 ? "account" : "accounts"}
      </p>
      <div className="mt-4 overflow-x-auto rounded-(--radius) border border-line">
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
          only ever get access to their own records.
        </p>
        <div className="mt-6">
          <PermissionMatrix granted={Object.fromEntries(byRole)} />
        </div>
      </section>
    </>
  );
}
