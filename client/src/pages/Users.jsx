import ResourcePage from '../components/ResourcePage';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { fmtTime } from '../utils/format';

export default function Users() {
  const { user: me } = useAuth();
  return (
    <ResourcePage
      title="Users"
      about="Administrators can change sources, rules, policies and users, and handle alerts. Viewers can read logs, analytics and alerts."
      path="/users"
      noun="user"
      defaults={{ username: '', email: '', password: '', role: 'VIEWER' }}
      fields={[
        { name: 'username', label: 'Username', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'password', label: 'Password', type: 'password', required: true },
        { name: 'role', label: 'Role', type: 'select', options: [['VIEWER', 'Viewer'], ['ADMIN', 'Administrator']] },
      ]}
      columns={[
        { label: 'Username', render: (u) => <>{u.username}{u.id === me?.id && <span className="muted"> (you)</span>}</> },
        { label: 'Email', render: (u) => u.email },
        { label: 'Role', render: (u) => <Badge value={u.role} /> },
        { label: 'Added', render: (u) => fmtTime(u.createdAt) },
      ]}
      deleteName={(u) => (u.id === me?.id ? null : u.username)}
    />
  );
}
