import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ChatPage from '@/pages/ChatPage';
import AnalysisPage from '@/pages/AnalysisPage';
import GalleryPage from '@/pages/GalleryPage';
import ProfilePage from '@/pages/ProfilePage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
const PAGE_MAP = {
    dashboard: DashboardPage,
    chat: ChatPage,
    analysis: AnalysisPage,
    gallery: GalleryPage,
    profile: ProfilePage,
    reports: ReportsPage,
    settings: SettingsPage,
    notifications: NotificationsPage,
};
function AppInner() {
    const { isLoggedIn, currentPage } = useApp();
    if (!isLoggedIn)
        return _jsx(LoginPage, {});
    const PageComponent = PAGE_MAP[currentPage] || DashboardPage;
    return (_jsxs("div", { className: "flex h-screen bg-slate-50 overflow-hidden", children: [_jsx(Sidebar, {}), _jsxs("div", { className: "flex-1 flex flex-col min-w-0 overflow-hidden", children: [_jsx(TopBar, {}), _jsx("main", { className: "flex-1 overflow-y-auto", children: _jsx(PageComponent, {}) })] })] }));
}
export default function App() {
    return _jsx(AppProvider, { children: _jsx(AppInner, {}) });
}
