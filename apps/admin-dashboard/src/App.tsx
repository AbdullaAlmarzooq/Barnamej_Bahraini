import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attractions from './pages/Attractions';
import Reviews from './pages/Reviews';
import Itineraries from './pages/Itineraries';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="attractions" element={<Attractions />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="itineraries" element={<Itineraries />} />
              {/* Default redirect for /admin */}
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
