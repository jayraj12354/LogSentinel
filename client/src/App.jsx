import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import Navbar from '../components/Navbar';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Logs from '../pages/Logs';
import Analytics from '../pages/Analytics';
import Alerts from '../pages/Alerts';
import Sources from '../pages/Sources';
import Rules from '../pages/Rules';
import Policies from '../pages/Policies';
import Users from '../pages/Users';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="logs" element={<Logs />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="sources" element={<Sources />} />
            <Route path="rules" element={<Rules />} />
            <Route path="policies" element={<Policies />} />
            <Route path="users" element={<Users />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}
