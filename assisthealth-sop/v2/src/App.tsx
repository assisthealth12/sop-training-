import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, ConfirmProvider } from './components/ui/ToastConfirm';

// Pages imports
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import NavigatorDashboard from './pages/NavigatorDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import Quiz from './pages/Quiz';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: string }) => {
  const { user, role } = useAuth();
  
  if (!user) return <Navigate to="/" />;
  if (allowedRole && role !== allowedRole) return <Navigate to={`/${role}-dashboard`} />;
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <ConfirmProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/navigator-dashboard" 
            element={
              <ProtectedRoute allowedRole="navigator">
                <NavigatorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/coordinator-dashboard" 
            element={
              <ProtectedRoute allowedRole="coordinator">
                <CoordinatorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quiz/:chapterId" 
            element={
              <ProtectedRoute>
                <Quiz />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
