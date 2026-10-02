import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { PlatformProvider } from './contexts/PlatformContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { RequireRole } from './components/RequireRole';
import { RequireOnboarded } from './components/RequireOnboarded';
import { SplashScreen } from './components/ui/SplashScreen';
import { AppShell } from './components/layout/AppShell';
import { AuthLayout } from './components/layout/AuthLayout';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { VerifyCredential } from './pages/VerifyCredential';
import { NotFound } from './pages/NotFound';
import { Onboarding } from './pages/student/Onboarding';
import { StudentDashboard } from './pages/student/Dashboard';
import { Assessment } from './pages/student/Assessment';
import { Results } from './pages/student/Results';
import { Modules } from './pages/student/Modules';
import { ModuleDetail } from './pages/student/ModuleDetail';
import { Progress } from './pages/student/Progress';
import { Credentials } from './pages/student/Credentials';
import { AdminOverview } from './pages/admin/Overview';
import { ModulesAdmin } from './pages/admin/ModulesAdmin';
import { CourseEditor } from './pages/admin/CourseEditor';
import { AssessmentAdmin } from './pages/admin/AssessmentAdmin';
import { StudentsAdmin } from './pages/admin/StudentsAdmin';
import { CredentialsAdmin } from './pages/admin/CredentialsAdmin';
import { InvitesAdmin } from './pages/admin/InvitesAdmin';
import { Notifications } from './pages/Notifications';
import { LanguagePill } from './components/layout/LanguagePill';
import { Settings } from './pages/Settings';
import { CookiePolicy } from './pages/legal/CookiePolicy';
import { CookieConsent } from './components/CookieConsent';
import { homeFor } from './utils/format';

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export function App() {
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setBooting(false), 900);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <BrowserRouter>
      <PlatformProvider>
        <AuthProvider>
          <PreferencesProvider>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>
              <Route path="/verify" element={<VerifyCredential />} />
              <Route path="/verify/:credentialId" element={<VerifyCredential />} />
              <Route
                path="/onboarding"
                element={
                <RequireRole role="student">
                    <Onboarding />
                  </RequireRole>
                } />
              

              <Route
                path="/app"
                element={
                <RequireRole role="student">
                    <RequireOnboarded>
                      <AppShell role="student" />
                    </RequireOnboarded>
                  </RequireRole>
                }>
                
                <Route index element={<StudentDashboard />} />
                <Route path="assessment" element={<Assessment />} />
                <Route path="results" element={<Results />} />
                <Route path="modules" element={<Modules />} />
                <Route path="modules/:moduleId" element={<ModuleDetail />} />
                <Route path="progress" element={<Progress />} />
                <Route path="credentials" element={<Credentials />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Navigate to="/app/settings" replace />} />
              </Route>

              <Route
                path="/admin"
                element={
                <RequireRole role="admin">
                    <AppShell role="admin" />
                  </RequireRole>
                }>
                
                <Route index element={<AdminOverview />} />
                <Route path="modules" element={<ModulesAdmin />} />
                <Route path="modules/new" element={<CourseEditor key="new" />} />
                <Route path="modules/:moduleId/edit" element={<CourseEditor />} />
                <Route path="assessment" element={<AssessmentAdmin />} />
                <Route path="students" element={<StudentsAdmin />} />
                <Route path="credentials" element={<CredentialsAdmin />} />
                <Route path="invites" element={<InvitesAdmin />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Navigate to="/admin/settings" replace />} />
              </Route>

              <Route path="/legal/cookies" element={<CookiePolicy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <LanguagePill />
            <CookieConsent />
            <AnimatePresence>{booting && <SplashScreen key="splash" />}</AnimatePresence>
            <Toaster position="top-center" offset="calc(12px + env(safe-area-inset-top))" toastOptions={{ className: 'font-sans text-sm' }} />
          </PreferencesProvider>
        </AuthProvider>
      </PlatformProvider>
    </BrowserRouter>);

}