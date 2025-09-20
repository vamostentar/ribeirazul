import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading, initialized } = useAuth();
  
  // Show loading while authentication is being initialized
  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }
  
  // Only redirect to login after initialization is complete and no user
  if (!user) {
    console.log('🔐 ProtectedRoute: No authenticated user, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('🔐 ProtectedRoute: User authenticated, allowing access');
  return children;
}
