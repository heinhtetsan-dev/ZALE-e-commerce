import { NavLink, Outlet } from 'react-router'

const tab = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200'}`

export function AdminLayout() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Admin</p>
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Admin">
          <NavLink to="/admin" end className={tab}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/products" className={tab}>
            Products
          </NavLink>
          <NavLink to="/admin/orders" className={tab}>
            Orders
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
