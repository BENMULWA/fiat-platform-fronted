
//@ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    RefreshCw, Search, Plus, X, ChevronDown, Check, Shield, ShieldCheck, ShieldAlert,
    Eye, EyeOff, Trash2, Edit3, Key, Users, Settings, FileText, Bell,
    Filter, AlertTriangle, Clock, UserCheck, UserX
} from 'lucide-react';
import {
    getAdminTeam,
    createAdminUser,
    toggleAdminUserStatus,
    deleteAdminUser,
    updateAdminUserPermissions,
    resetAdminUserPassword
} from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'disabled';
    lastActive: string;
    permissions: string[];
}

interface PermissionConfig {
    key: string;
    label: string;
    description: string;
    category: 'trading' | 'finance' | 'operations' | 'compliance';
}

const PERMISSIONS_CONFIG: PermissionConfig[] = [
    { key: 'quotes', label: 'Quote Trades', description: 'Create and manage trade quotes', category: 'trading' },
    { key: 'settlements', label: 'Approve Settlements', description: 'Review and approve settlements', category: 'finance' },
    { key: 'funds', label: 'Release Funds', description: 'Authorize fund releases', category: 'finance' },
    { key: 'profits', label: 'View Profits', description: 'Access profit and loss reports', category: 'operations' },
    { key: 'reports', label: 'Export Reports', description: 'Generate and export system reports', category: 'operations' },
    { key: 'users', label: 'Manage Users', description: 'Create, edit, and disable users', category: 'compliance' },
    { key: 'kyc', label: 'Review KYC', description: 'Review and approve KYC submissions', category: 'compliance' },
    { key: 'treasury', label: 'Manage Treasury', description: 'Access treasury management features', category: 'finance' },
    { key: 'rates', label: 'Set Rates', description: 'Configure exchange rates', category: 'trading' },
    { key: 'audit', label: 'View Audit Logs', description: 'Access system audit trail', category: 'compliance' },
];

const ROLE_PRESETS = [
    { name: 'Super Admin', permissions: PERMISSIONS_CONFIG.map(p => p.key), color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/20', description: 'Full system access' },
    { name: 'Dealer', permissions: ['quotes', 'rates'], color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/20', description: 'Trade execution & pricing' },
    { name: 'Compliance', permissions: ['kyc', 'audit', 'settlements'], color: 'text-amber-500', bgColor: 'bg-amber-500/10 border-amber-500/20', description: 'Regulatory & compliance' },
    { name: 'Finance', permissions: ['settlements', 'funds', 'profits', 'treasury', 'reports'], color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/20', description: 'Financial operations' },
    { name: 'Support', permissions: ['reports', 'audit'], color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/20', description: 'Customer support & reporting' },
];

const PERMISSION_CATEGORIES = [
    { key: 'trading', label: 'Trading', icon: '📈' },
    { key: 'finance', label: 'Finance', icon: '💰' },
    { key: 'operations', label: 'Operations', icon: '⚙️' },
    { key: 'compliance', label: 'Compliance', icon: '🛡️' },
];

const MOCK_AUDIT_LOGS = [
    { id: '1', userId: 'u1', userName: 'System', action: 'Created User', target: 'User', timestamp: '2 min ago', ipAddress: '192.168.1.1' },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SystemAdmin() {
    const { user: currentUser } = useAuth();

    const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'audit' | 'notifications'>('users');
    const [staff, setStaff] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [createFormData, setCreateFormData] = useState({ name: '', email: '', role: 'dealer', password: '', confirmPassword: '' });
    const [createPermissions, setCreatePermissions] = useState<Record<string, boolean>>({});
    const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);

    const [notificationSettings, setNotificationSettings] = useState({
        newUserCreated: true, userDisabled: true, loginAttempt: false, settlementApproved: true, kycSubmitted: false, dailyReport: true, weeklyReport: false,
    });

    const initPerms = () => {
        const p: Record<string, boolean> = {};
        PERMISSIONS_CONFIG.forEach(perm => { p[perm.key] = false; });
        return p;
    };

    const fetchStaff = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getAdminTeam();
            const data = res.data?.team || res.data || [];
            setStaff(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to load team members.");
            setStaff([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStaff();
        setCreatePermissions(initPerms());
        setEditPermissions(initPerms());
    }, [fetchStaff]);

    const filteredStaff = useMemo(() => {
        return staff.filter(user => {
            const matchesSearch = !searchQuery || user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || user.role?.toLowerCase() === roleFilter.toLowerCase();
            const matchesStatus = statusFilter === 'all' || user.status?.toLowerCase() === statusFilter.toLowerCase();
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [staff, searchQuery, roleFilter, statusFilter]);

    const stats = useMemo(() => ({
        total: staff.length,
        active: staff.filter(u => u.status === 'active').length,
        disabled: staff.filter(u => u.status === 'disabled').length,
    }), [staff]);

    const handleToggleStatus = async (userId: string) => {
        const user = staff.find(u => u.id === userId);
        if (!user || !window.confirm(`Are you sure you want to ${user.status === 'active' ? 'disable' : 'enable'} ${user.name}?`)) return;
        try {
            await toggleAdminUserStatus(userId);
            setStaff(prev => prev.map(u => u.id === userId ? { ...u, status: u.status === 'active' ? 'disabled' as const : 'active' as const } : u));
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to update status.");
            fetchStaff();
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (createFormData.password !== createFormData.confirmPassword) return alert("Passwords do not match.");
        if (createFormData.password.length < 8) return alert("Password must be at least 8 characters.");

        setIsSubmitting(true);
        const selectedPerms = Object.entries(createPermissions).filter(([_, val]) => val).map(([key]) => key);
        try {
            await createAdminUser({ name: createFormData.name, email: createFormData.email, role: createFormData.role, password: createFormData.password, permissions: selectedPerms });
            closeCreateModal();
            fetchStaff();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to create user.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdatePermissions = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsSubmitting(true);
        const selectedPerms = Object.entries(editPermissions).filter(([_, val]) => val).map(([key]) => key);
        try {
            await updateAdminUserPermissions(selectedUser.id, selectedPerms);
            closeEditModal();
            fetchStaff();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to update permissions.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || passwordForm.newPassword !== passwordForm.confirmPassword || passwordForm.newPassword.length < 8) return alert("Invalid password.");
        setIsSubmitting(true);
        try {
            await resetAdminUserPassword(selectedUser.id, passwordForm.newPassword);
            closePasswordModal();
            alert("Password reset successfully.");
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to reset password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser || selectedUser.email === currentUser?.email) return alert("Cannot delete own account.");
        setIsSubmitting(true);
        try {
            await deleteAdminUser(selectedUser.id);
            closeDeleteModal();
            fetchStaff();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to delete user.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const applyRolePreset = (roleName: string, isEdit: boolean) => {
        const preset = ROLE_PRESETS.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!preset) return;
        const newPerms: Record<string, boolean> = {};
        PERMISSIONS_CONFIG.forEach(p => { newPerms[p.key] = preset.permissions.includes(p.key); });
        isEdit ? setEditPermissions(newPerms) : setCreatePermissions(newPerms);
    };

    const closeCreateModal = () => { setIsCreateModalOpen(false); setCreateFormData({ name: '', email: '', role: 'dealer', password: '', confirmPassword: '' }); setCreatePermissions(initPerms()); setShowPassword(false); setShowConfirmPassword(false); };
    const closeEditModal = () => { setIsEditModalOpen(false); setSelectedUser(null); };
    const closePasswordModal = () => { setIsPasswordModalOpen(false); setSelectedUser(null); setPasswordForm({ newPassword: '', confirmPassword: '' }); };
    const closeDeleteModal = () => { setIsDeleteModalOpen(false); setSelectedUser(null); };

    const getRoleBadge = (role: string) => {
        const preset = ROLE_PRESETS.find(r => r.name.toLowerCase() === role?.toLowerCase());
        return preset ? <span className={`${preset.bgColor} ${preset.color} border px-2.5 py-1 rounded text-xs font-semibold`}>{preset.name}</span> : <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2.5 py-1 rounded text-xs font-semibold">{role}</span>;
    };

    const getPasswordStrength = (password: string) => {
        let s = 0;
        if (password.length >= 8) s++; if (password.length >= 12) s++; if (/[A-Z]/.test(password)) s++; if (/[0-9]/.test(password)) s++; if (/[^A-Za-z0-9]/.test(password)) s++;
        const l = [{ l: 'Weak', c: 'bg-red-500', w: '20%' }, { l: 'Fair', c: 'bg-orange-500', w: '40%' }, { l: 'Good', c: 'bg-yellow-500', w: '60%' }, { l: 'Strong', c: 'bg-emerald-500', w: '80%' }, { l: 'Very Strong', c: 'bg-emerald-400', w: '100%' }];
        return l[Math.min(s, 4)];
    };

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAB308]/10 border border-[#EAB308]/20 flex items-center justify-center"><Shield className="w-5 h-5 text-[#EAB308]" /></div>
                    <div><h1 className="text-2xl font-bold text-white tracking-tight">Administration</h1><p className="text-xs text-gray-500">Manage team access, roles & permissions</p></div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchStaff} className="p-2.5 rounded-lg border border-[#1e2d3d] hover:border-[#EAB308]/30 text-gray-400 hover:text-[#EAB308] transition-all"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
                    <button onClick={() => setIsCreateModalOpen(true)} className="bg-[#EAB308] hover:bg-[#D97706] text-black px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg active:scale-95 flex items-center gap-2"><Plus className="w-4 h-4" />Create User</button>
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-xl p-4"><div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500 font-semibold uppercase">Total</span><Users className="w-4 h-4 text-gray-600" /></div><p className="text-2xl font-bold text-white">{stats.total}</p></div>
                <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-xl p-4"><div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500 font-semibold uppercase">Active</span><UserCheck className="w-4 h-4 text-emerald-500" /></div><p className="text-2xl font-bold text-emerald-500">{stats.active}</p></div>
                <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-xl p-4"><div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500 font-semibold uppercase">Disabled</span><UserX className="w-4 h-4 text-red-500" /></div><p className="text-2xl font-bold text-red-500">{stats.disabled}</p></div>
                <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-xl p-4"><div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500 font-semibold uppercase">Roles</span><ShieldCheck className="w-4 h-4 text-[#EAB308]" /></div><div className="flex flex-wrap gap-1 mt-1">{ROLE_PRESETS.map(r => <span key={r.name} className={`text-[10px] font-bold ${r.color}`}>{r.name}</span>)}</div></div>
            </div>

            {/* TABS */}
            <div className="flex items-center gap-1 mb-6 bg-[#0B0F19] border border-[#1e2d3d] rounded-xl p-1 w-fit">
                {[{ key: 'users' as const, label: 'Users & Roles', icon: Users }, { key: 'settings' as const, label: 'Settings', icon: Settings }, { key: 'audit' as const, label: 'Audit Log', icon: FileText }, { key: 'notifications' as const, label: 'Notifications', icon: Bell }].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-[#EAB308] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-[#1e2d3d]'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
                ))}
            </div>

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or email..." className="w-full bg-[#0B0F19] border border-[#1e2d3d] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#EAB308] outline-none transition-colors placeholder-gray-600" />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>}
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all ${showFilters ? 'border-[#EAB308]/30 bg-[#EAB308]/10 text-[#EAB308]' : 'border-[#1e2d3d] text-gray-400 hover:text-white'}`}><Filter className="w-4 h-4" />Filters</button>
                    </div>

                    {showFilters && (
                        <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-[#0B0F19] border border-[#1e2d3d] rounded-lg py-2 px-3 text-sm text-white outline-none"><option value="all">All Roles</option>{ROLE_PRESETS.map(r => <option key={r.name} value={r.name.toLowerCase()}>{r.name}</option>)}</select>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0B0F19] border border-[#1e2d3d] rounded-lg py-2 px-3 text-sm text-white outline-none"><option value="all">All Status</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
                        </div>
                    )}

                    <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="bg-[#111827] border-b border-[#1e2d3d] text-[10px] font-bold text-gray-500 uppercase tracking-widest"><th className="py-4 px-6">Member</th><th className="py-4 px-6">Role</th><th className="py-4 px-6">Permissions</th><th className="py-4 px-6">Last Active</th><th className="py-4 px-6">Status</th><th className="py-4 px-6 text-right">Actions</th></tr></thead>
                                <tbody className="divide-y divide-[#1e2d3d]/50">
                                    {isLoading ? (<tr><td colSpan={6} className="py-20 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-3" /></td></tr>) : error ? (<tr><td colSpan={6} className="py-16 text-center text-red-400 text-sm">{error} <button onClick={fetchStaff} className="text-[#EAB308] ml-2 underline">Retry</button></td></tr>) : filteredStaff.length === 0 ? (<tr><td colSpan={6} className="py-16 text-center text-gray-500">No team members found.</td></tr>) : filteredStaff.map((user) => (
                                        <tr key={user.id} className={`hover:bg-[#1a2a40]/30 transition-colors text-sm ${user.status === 'disabled' ? 'opacity-60' : ''}`}>
                                            <td className="py-4 px-6"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{user.name?.charAt(0)}</div><div><p className="font-bold text-white">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></div></div></td>
                                            <td className="py-4 px-6">{getRoleBadge(user.role)}</td>
                                            <td className="py-4 px-6 text-gray-400 text-xs">{user.permissions?.length || 0} permissions</td>
                                            <td className="py-4 px-6 text-gray-500 text-xs">{user.lastActive || 'Never'}</td>
                                            <td className="py-4 px-6"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}><div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />{user.status}</span></td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setSelectedUser(user); const p: Record<string, boolean> = {}; PERMISSIONS_CONFIG.forEach(pc => { p[pc.key] = user.permissions?.includes(pc.key) || false; }); setEditPermissions(p); setIsEditModalOpen(true); }} className="p-2 rounded-lg text-gray-500 hover:text-[#EAB308] hover:bg-[#EAB308]/10 transition-all"><Edit3 className="w-4 h-4" /></button>
                                                    <button onClick={() => { setSelectedUser(user); setPasswordForm({ newPassword: '', confirmPassword: '' }); setIsPasswordModalOpen(true); }} className="p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"><Key className="w-4 h-4" /></button>
                                                    <button onClick={() => handleToggleStatus(user.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${user.status === 'active' ? 'text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'}`}>{user.status === 'active' ? 'Disable' : 'Enable'}</button>
                                                    {user.email !== currentUser?.email && <button onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); }} className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* PLACEHOLDER TABS */}
            {activeTab === 'settings' && <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-xl p-12 text-center text-gray-500">Settings configuration coming soon.</div>}
            {activeTab === 'audit' && <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-xl p-12 text-center text-gray-500">Audit log coming soon.</div>}
            {activeTab === 'notifications' && <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-xl p-12 text-center text-gray-500">Notification settings coming soon.</div>}

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) closeCreateModal(); }}>
                    <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-[#1e2d3d] flex justify-between"><h2 className="text-xl font-bold text-white">Create User</h2><button onClick={closeCreateModal} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Full Name</label><input type="text" value={createFormData.name} onChange={e => setCreateFormData({ ...createFormData, name: e.target.value })} className="w-full bg-[#111827] border border-[#1e2d3d] rounded-lg py-2.5 px-4 text-sm text-white focus:border-[#EAB308] outline-none" required /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Email</label><input type="email" value={createFormData.email} onChange={e => setCreateFormData({ ...createFormData, email: e.target.value })} className="w-full bg-[#111827] border border-[#1e2d3d] rounded-lg py-2.5 px-4 text-sm text-white focus:border-[#EAB308] outline-none" required /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Role</label><select value={createFormData.role} onChange={e => { setCreateFormData({ ...createFormData, role: e.target.value }); applyRolePreset(e.target.value, false); }} className="w-full bg-[#111827] border border-[#1e2d3d] rounded-lg py-2.5 px-4 text-sm text-white focus:border-[#EAB308] outline-none appearance-none">{ROLE_PRESETS.map(r => <option key={r.name} value={r.name.toLowerCase()}>{r.name}</option>)}</select></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Password</label><div className="relative"><input type={showPassword ? 'text' : 'password'} value={createFormData.password} onChange={e => setCreateFormData({ ...createFormData, password: e.target.value })} className="w-full bg-[#111827] border border-[#1e2d3d] rounded-lg py-2.5 px-4 pr-10 text-sm text-white focus:border-[#EAB308] outline-none" required minLength={8} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Confirm Password</label><input type="password" value={createFormData.confirmPassword} onChange={e => setCreateFormData({ ...createFormData, confirmPassword: e.target.value })} className="w-full bg-[#111827] border border-[#1e2d3d] rounded-lg py-2.5 px-4 text-sm text-white focus:border-[#EAB308] outline-none" required /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Permissions</label><div className="grid grid-cols-2 gap-2">{PERMISSIONS_CONFIG.map(p => (<label key={p.key} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[#1e2d3d]/50"><div className={`w-4 h-4 rounded border flex items-center justify-center ${createPermissions[p.key] ? 'bg-[#EAB308] border-[#EAB308]' : 'bg-[#111827] border-[#1e2d3d]'}`}>{createPermissions[p.key] && <Check className="w-3 h-3 text-black" />}</div><input type="checkbox" className="hidden" checked={createPermissions[p.key]} onChange={() => setCreatePermissions({ ...createPermissions, [p.key]: !createPermissions[p.key] })} /><span className="text-xs text-gray-300">{p.label}</span></label>))}</div></div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-[#1e2d3d]"><button type="button" onClick={closeCreateModal} className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancel</button><button type="submit" disabled={isSubmitting} className="bg-[#EAB308] hover:bg-[#D97706] text-black px-6 py-2.5 rounded-lg text-sm font-bold">{isSubmitting ? 'Creating...' : 'Create'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) closeEditModal(); }}>
                    <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-[#1e2d3d] flex justify-between"><h2 className="text-xl font-bold text-white">Edit: {selectedUser.name}</h2><button onClick={closeEditModal} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
                        <form onSubmit={handleUpdatePermissions} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Quick Apply Role</label><div className="flex flex-wrap gap-2">{ROLE_PRESETS.map(r => (<button key={r.name} type="button" onClick={() => applyRolePreset(r.name, true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#1e2d3d] text-gray-400 hover:text-white">{r.name}</button>))}</div></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Permissions</label><div className="grid grid-cols-2 gap-2">{PERMISSIONS_CONFIG.map(p => (<label key={p.key} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[#1e2d3d]/50"><div className={`w-4 h-4 rounded border flex items-center justify-center ${editPermissions[p.key] ? 'bg-[#EAB308] border-[#EAB308]' : 'bg-[#111827] border-[#1e2d3d]'}`}>{editPermissions[p.key] && <Check className="w-3 h-3 text-black" />}</div><input type="checkbox" className="hidden" checked={editPermissions[p.key]} onChange={() => setEditPermissions({ ...editPermissions, [p.key]: !editPermissions[p.key] })} /><span className="text-xs text-gray-300">{p.label}</span></label>))}</div></div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-[#1e2d3d]"><button type="button" onClick={closeEditModal} className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancel</button><button type="submit" disabled={isSubmitting} className="bg-[#EAB308] hover:bg-[#D97706] text-black px-6 py-2.5 rounded-lg text-sm font-bold">{isSubmitting ? 'Saving...' : 'Save'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* PASSWORD MODAL */}
            {isPasswordModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) closePasswordModal(); }}>
                    <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-[#1e2d3d] flex justify-between"><h2 className="text-xl font-bold text-white">Reset Password</h2><button onClick={closePasswordModal} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
                        <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2 text-amber-500 text-xs"><AlertTriangle className="w-4 h-4" />User will need to use this password on next login.</div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">New Password</label><input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-[#111827] border border-[#1e2d3d] rounded-lg py-2.5 px-4 text-sm text-white focus:border-[#EAB308] outline-none" required minLength={8} /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-2">Confirm Password</label><input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full bg-[#111827] border border-[#1e2d3d] rounded-lg py-2.5 px-4 text-sm text-white focus:border-[#EAB308] outline-none" required /></div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-[#1e2d3d]"><button type="button" onClick={closePasswordModal} className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancel</button><button type="submit" disabled={isSubmitting} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold">{isSubmitting ? 'Resetting...' : 'Reset'}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {isDeleteModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) closeDeleteModal(); }}>
                    <div className="bg-[#0B0F19] border border-[#1e2d3d] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center"><Trash2 className="w-8 h-8 text-red-500" /></div>
                        <h2 className="text-xl font-bold text-white mb-2">Delete {selectedUser.name}?</h2>
                        <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-3 mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3"><button onClick={closeDeleteModal} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-400 border border-[#1e2d3d] rounded-lg">Cancel</button><button onClick={handleDeleteUser} disabled={isSubmitting} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold">{isSubmitting ? 'Deleting...' : 'Delete'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}