import { AuthProvider, AuthGate, SuperAdminOnly } from './components/auth/AuthProvider';

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import IssueEntry from './components/IssueEntry';
import IssueReports from './components/IssueReports';
import CSATReport from './components/CSATReport';
import MonthlyEntry from './components/MonthlyEntry';
import MonthlyReports from './components/MonthlyReports';
import DowntimeEntry from './components/DowntimeEntry';
import DowntimeReports from './components/DowntimeReports';
import Settings from './components/Settings';
import Analytics from './components/Analytics';
import WeeklyReport from './components/WeeklyReport';
import SimFinder from './components/SimFinder';
import NoticeGenerator from './components/NoticeGenerator';
import { RetentionDashboard } from './components/retention/RetentionDashboard';
import { RetentionCustomers } from './components/retention/RetentionCustomers';
import { CustomerAssignment } from './components/retention/CustomerAssignment';
import { TeamMembers } from './components/retention/TeamMembers';
import { MonthlyFollowup } from './components/retention/MonthlyFollowup';
import { CustomerFeedback } from './components/retention/CustomerFeedback';
import { RetentionReports } from './components/retention/RetentionReports';
import { SalesDashboard } from './components/sales/SalesDashboard';
import { AddSales } from './components/sales/AddSales';
import { SalesReport } from './components/sales/SalesReport';
import { AdminLoginPage } from './components/admin/AdminLoginPage';
import { AdminPanelPage } from './components/admin/AdminPanelPage';
import { CustomerFeedbackPage } from './components/CustomerFeedbackPage';
import { ModuleRouteGuard } from './components/common/ModuleRouteGuard';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider><AuthGate><Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="/dashboard" 
            element={
              <ModuleRouteGuard moduleId="Dashboard" moduleName="Dashboard">
                <Dashboard />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/issue-entry" 
            element={
              <ModuleRouteGuard moduleId="IssueEntry" moduleName="Issue Entry">
                <IssueEntry />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/issue-reports" 
            element={
              <ModuleRouteGuard moduleId="IssueReports" moduleName="Issue Reports">
                <IssueReports />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/csat-report" 
            element={
              <ModuleRouteGuard moduleId="CSATReport" moduleName="CSAT Report">
                <CSATReport />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/monthly-entry" 
            element={
              <ModuleRouteGuard moduleId="MonthlyEntry" moduleName="Monthly Entry">
                <MonthlyEntry />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/monthly-reports" 
            element={
              <ModuleRouteGuard moduleId="MonthlyReports" moduleName="Monthly Reports">
                <MonthlyReports />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/downtime-entry" 
            element={
              <ModuleRouteGuard moduleId="DowntimeEntry" moduleName="Downtime Entry">
                <DowntimeEntry />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/downtime-reports" 
            element={
              <ModuleRouteGuard moduleId="DowntimeReports" moduleName="Downtime Reports">
                <DowntimeReports />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ModuleRouteGuard moduleId="Settings" moduleName="Settings">
                <SuperAdminOnly><Settings /></SuperAdminOnly>
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/notice-generator" 
            element={
              <ModuleRouteGuard moduleId="NoticeGenerator" moduleName="Notice Generator">
                <NoticeGenerator />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/sim-finder" 
            element={
              <ModuleRouteGuard moduleId="SimFinder" moduleName="SIM Finder">
                <SimFinder />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ModuleRouteGuard moduleId="Analytics" moduleName="Analytics">
                <Analytics />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/weekly-report" 
            element={
              <ModuleRouteGuard moduleId="WeeklyReport" moduleName="Weekly Report">
                <WeeklyReport />
              </ModuleRouteGuard>
            } 
          />
          
          {/* Sales Module Routes */}
          <Route 
            path="/sales" 
            element={
              <ModuleRouteGuard moduleId="Sales" moduleName="Sales Management">
                <Navigate to="/sales/dashboard" replace />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/sales/dashboard" 
            element={
              <ModuleRouteGuard moduleId="Sales" moduleName="Sales Management">
                <SalesDashboard />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/sales/add" 
            element={
              <ModuleRouteGuard moduleId="Sales" moduleName="Sales Management">
                <AddSales />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/sales/report" 
            element={
              <ModuleRouteGuard moduleId="Sales" moduleName="Sales Management">
                <SalesReport />
              </ModuleRouteGuard>
            } 
          />

          {/* Retention Module Routes */}
          <Route 
            path="/retention" 
            element={
              <ModuleRouteGuard moduleId="Retention" moduleName="Client Retention">
                <Navigate to="/retention/dashboard" replace />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/retention/dashboard" 
            element={
              <ModuleRouteGuard moduleId="Retention" moduleName="Client Retention">
                <RetentionDashboard />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/retention/customers" 
            element={
              <ModuleRouteGuard moduleId="Retention" moduleName="Client Retention">
                <RetentionCustomers />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/retention/assignment" 
            element={
              <ModuleRouteGuard moduleId="Retention" moduleName="Client Retention">
                <CustomerAssignment />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/retention/team" 
            element={
              <ModuleRouteGuard moduleId="Retention" moduleName="Client Retention">
                <TeamMembers />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/retention/followup" 
            element={
              <ModuleRouteGuard moduleId="Retention" moduleName="Client Retention">
                <MonthlyFollowup />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/retention/feedback" 
            element={
              <ModuleRouteGuard moduleId="Retention" moduleName="Client Retention">
                <CustomerFeedback />
              </ModuleRouteGuard>
            } 
          />
          <Route 
            path="/retention/reports" 
            element={
              <ModuleRouteGuard moduleId="Retention" moduleName="Client Retention">
                <RetentionReports />
              </ModuleRouteGuard>
            } 
          />

          {/* Customer Feedback Routes (Public for clients) */}
          <Route path="/feedback/:id" element={<CustomerFeedbackPage />} />
          <Route path="/client-feedback/:id" element={<CustomerFeedbackPage />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<SuperAdminOnly><AdminPanelPage /></SuperAdminOnly>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout></AuthGate></AuthProvider>
    </BrowserRouter>
  );
};

export default App;
