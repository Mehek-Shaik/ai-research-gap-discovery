/**
 * AI-Powered Research Gap Discovery Platform
 * Root Application Component with Authentication & React Router
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { Layout } from './components/Layout.tsx';

// Public Pages
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';

// Authenticated Research Workspace Pages
import { Dashboard } from './pages/Dashboard.tsx';
import { UploadPage } from './pages/UploadPage.tsx';
import { LibraryPage } from './pages/LibraryPage.tsx';
import { AnalyzePage } from './pages/AnalyzePage.tsx';
import { GapsPage } from './pages/GapsPage.tsx';
import { ComparePage } from './pages/ComparePage.tsx';
import { RecommendationsPage } from './pages/RecommendationsPage.tsx';
import { ProposalWorkspacePage } from './pages/ProposalWorkspacePage.tsx';
import { LandscapePage } from './pages/LandscapePage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Research Workspace Modules */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/gaps" element={<GapsPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/proposals" element={<ProposalWorkspacePage />} />
            <Route path="/landscape" element={<LandscapePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
