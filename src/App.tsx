import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import FullScreenLoader from '@/components/FullScreenLoader';

// Cada área vira um arquivo separado no build. Antes tudo vinha num pacote só
// de ~785 kB: a aluna baixava a landing inteira (GSAP, vídeo de fundo) e o
// painel admin (gráficos do recharts) só para abrir o treino do dia.
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Cadastro = lazy(() => import('@/pages/auth/Cadastro'));
const RecuperarSenha = lazy(() => import('@/pages/auth/RecuperarSenha'));
const RedefinirSenha = lazy(() => import('@/pages/auth/RedefinirSenha'));
const Checkout = lazy(() => import('@/pages/Checkout'));

const MemberLayout = lazy(() => import('@/pages/member/MemberLayout'));
const Dashboard = lazy(() => import('@/pages/member/Dashboard'));
const WorkoutList = lazy(() => import('@/pages/member/WorkoutList'));
const WorkoutDetail = lazy(() => import('@/pages/member/WorkoutDetail'));
const Progress = lazy(() => import('@/pages/member/Progress'));
const SubscriptionPage = lazy(() => import('@/pages/member/SubscriptionPage'));
const ProfilePage = lazy(() => import('@/pages/member/ProfilePage'));

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminWorkouts = lazy(() => import('@/pages/admin/AdminWorkouts'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminPlans = lazy(() => import('@/pages/admin/AdminPlans'));
const AdminStudents = lazy(() => import('@/pages/admin/AdminStudents'));
const AdminAnnouncements = lazy(() => import('@/pages/admin/AdminAnnouncements'));

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Suspense fallback={<FullScreenLoader />}>
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
        </Suspense>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
