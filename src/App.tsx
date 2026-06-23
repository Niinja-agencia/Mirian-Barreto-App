import { Routes, Route, Navigate } from 'react-router';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import ProtectedRoute from '@/components/ProtectedRoute';

import Landing from '@/pages/Landing';
import Login from '@/pages/auth/Login';
import Cadastro from '@/pages/auth/Cadastro';
import RecuperarSenha from '@/pages/auth/RecuperarSenha';
import RedefinirSenha from '@/pages/auth/RedefinirSenha';
import Checkout from '@/pages/Checkout';

import MemberLayout from '@/pages/member/MemberLayout';
import Dashboard from '@/pages/member/Dashboard';
import WorkoutList from '@/pages/member/WorkoutList';
import WorkoutDetail from '@/pages/member/WorkoutDetail';
import Progress from '@/pages/member/Progress';
import SubscriptionPage from '@/pages/member/SubscriptionPage';
import ProfilePage from '@/pages/member/ProfilePage';

import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminWorkouts from '@/pages/admin/AdminWorkouts';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminPlans from '@/pages/admin/AdminPlans';
import AdminStudents from '@/pages/admin/AdminStudents';
import AdminAnnouncements from '@/pages/admin/AdminAnnouncements';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Routes>
          {/* Público */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

          {/* Checkout (exige login) */}
          <Route
            path="/checkout/:slug"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />

          {/* Área da aluna */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MemberLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="treinos" element={<WorkoutList />} />
            <Route path="treinos/:id" element={<WorkoutDetail />} />
            <Route path="progresso" element={<Progress />} />
            <Route path="assinatura" element={<SubscriptionPage />} />
            <Route path="perfil" element={<ProfilePage />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="treinos" element={<AdminWorkouts />} />
            <Route path="categorias" element={<AdminCategories />} />
            <Route path="planos" element={<AdminPlans />} />
            <Route path="alunas" element={<AdminStudents />} />
            <Route path="avisos" element={<AdminAnnouncements />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
