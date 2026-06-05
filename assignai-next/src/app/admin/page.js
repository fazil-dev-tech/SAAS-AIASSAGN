"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line
} from 'recharts';
import { 
  Search, Users, LayoutDashboard, Settings, 
  Activity, Clock, FileText, Server, AlertCircle, CheckCircle2, ChevronRight, Lock, 
  Trash2, Eye, Download, ShieldAlert, PowerOff, Database, Cpu, HardDrive, Network, 
  ArrowUpDown, ExternalLink, Shield
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const sb = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null;

// ─── 3D TILT CARD COMPONENT ───
const TiltCard = ({ children, style, className }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        perspective: 1000,
        transformStyle: "preserve-3d",
        rotateX,
        rotateY
      }}
      className={className}
    >
      <div style={{ transform: "translateZ(30px)", width: '100%', height: '100%', pointerEvents: 'none' }}>
        {children}
      </div>
    </motion.div>
  );
};

export default function FuturisticAdminPortal() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [toasts, setToasts] = useState([]);
  
  const [stats, setStats] = useState({ reports: 0, words: 0 });
  const [savedReports, setSavedReports] = useState([]);
  const [dbUsers, setDbUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Features State
  const [ping, setPing] = useState('...');
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [auditSort, setAuditSort] = useState('newest'); // newest, oldest, words_high
  const [userSort, setUserSort] = useState('reports_high'); // reports_high, newest, name_asc
  
  // Pagination
  const [auditPage, setAuditPage] = useState(1);
  const auditPerPage = 10;
  const [usersPage, setUsersPage] = useState(1);
  const usersPerPage = 10;

  // System Health Mock Data
  const [sysHealth, setSysHealth] = useState(Array.from({length: 20}, (_, i) => ({ time: i, cpu: 30, ram: 45, net: 10 })));

  const toast = (msg, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  useEffect(() => {
    const storedAdmin = localStorage.getItem('assignai_admin_logged_in');
    const lastActive = localStorage.getItem('assignai_admin_last_active');
    
    // Session Timeout (30 minutes)
    if (storedAdmin === 'true' && lastActive) {
      if (Date.now() - parseInt(lastActive) > 30 * 60 * 1000) {
        toast('Session expired due to inactivity', 'error');
        localStorage.removeItem('assignai_admin_logged_in');
      } else {
        setIsAdminLoggedIn(true);
      }
    }
    setIsLoading(false);

    const handleInteraction = () => localStorage.setItem('assignai_admin_last_active', Date.now().toString());
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchAdminData = async () => {
    if (sb) {
      const [resReports, resUsers] = await Promise.all([
        sb.from('reports').select('*').order('created_at', { ascending: false }),
        sb.from('users').select('*')
      ]);
      if (resReports.data) {
        setSavedReports(resReports.data);
        setStats({
          reports: resReports.data.length,
          words: resReports.data.reduce((sum, r) => sum + (r.word_count || 0), 0)
        });
      }
      if (resUsers.data) {
        setDbUsers(resUsers.data);
      }
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAdminData();
      
      const measurePing = async () => {
        const start = performance.now();
        try {
          await fetch('/api/auth/send-otp', { method: 'OPTIONS' });
          const end = performance.now();
          setPing(`${Math.round(end - start)}ms`);
        } catch {
          setPing('Err');
        }
      };
      measurePing();
      
      const interval = setInterval(() => {
        measurePing();
        setSysHealth(prev => {
          const next = [...prev.slice(1)];
          next.push({
            time: prev[prev.length-1].time + 1,
            cpu: Math.min(100, Math.max(10, prev[prev.length-1].cpu + (Math.random() * 20 - 10))),
            ram: Math.min(100, Math.max(20, prev[prev.length-1].ram + (Math.random() * 10 - 5))),
            net: Math.min(100, Math.max(5, prev[prev.length-1].net + (Math.random() * 30 - 15)))
          });
          return next;
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdminLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (authEmail === 'mohamedfazilpasha156@gmail.com' && authPassword === 'TGVINCENZO') {
      setIsAdminLoggedIn(true);
      localStorage.setItem('assignai_admin_logged_in', 'true');
      localStorage.setItem('assignai_admin_last_active', Date.now().toString());
      toast('Admin Authenticated Securely', 'success');
    } else {
      toast('Access Denied: Invalid Credentials', 'error');
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('assignai_admin_logged_in');
    localStorage.removeItem('assignai_admin_last_active');
    setAuthEmail('');
    setAuthPassword('');
    toast('Session Terminated Securely', 'success');
  };

  const impersonateUser = (user) => {
    if (!confirm(`Launch frontend application impersonating ${user.email}?`)) return;
    localStorage.setItem('assignai_user', JSON.stringify({ email: user.email, name: user.name, id: user.email }));
    localStorage.setItem('assignai_user_login_time', Date.now().toString());
    window.location.href = '/';
  };

  const suspendUser = async (email, currentStatus) => {
    if (!sb) return;
    const newStatus = !currentStatus;
    const { error } = await sb.from('users').update({ is_suspended: newStatus }).eq('email', email);
    if (error) {
      toast(`Failed to update suspension status`, 'error');
    } else {
      toast(`User ${email} ${newStatus ? 'Suspended' : 'Restored'}`, 'success');
      fetchAdminData(); 
      if (selectedUser && selectedUser.email === email) {
        setSelectedUser(prev => ({ ...prev, is_suspended: newStatus }));
      }
    }
  };

  const deleteUser = async (email) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete user ${email}? This cannot be undone.`)) return;
    if (!sb) return;
    await sb.from('reports').delete().eq('user_id', email);
    const { error } = await sb.from('users').delete().eq('email', email);
    if (error) {
      toast(`Failed to delete user`, 'error');
    } else {
      toast(`User ${email} permanently deleted`, 'success');
      setSelectedUser(null);
      fetchAdminData();
    }
  };

  const deleteReport = async (id) => {
    if (!confirm(`Delete this report from the database?`)) return;
    if (!sb) return;
    const { error } = await sb.from('reports').delete().eq('id', id);
    if (error) {
      toast('Failed to delete report', 'error');
    } else {
      toast('Report deleted successfully', 'success');
      setViewingReport(null);
      fetchAdminData();
    }
  };

  const exportCSV = (type) => {
    let dataToExport = [];
    let headers = [];
    let filename = '';

    if (type === 'users') {
      headers = ['Email', 'Name', 'Total Reports', 'Total Words', 'Last Active', 'Suspended'];
      dataToExport = usersData.map(u => [u.email, u.name, u.reports, u.totalWords, u.lastActive, u.is_suspended || false]);
      filename = 'assignai_users_export.csv';
    } else if (type === 'reports') {
      headers = ['Report ID', 'User Email', 'Title', 'Course', 'Word Count', 'Created At'];
      dataToExport = savedReports.map(r => [r.id, r.user_id, r.assignment_title, r.course_name, r.word_count, r.created_at]);
      filename = 'assignai_reports_export.csv';
    }

    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(`${type.toUpperCase()} exported successfully`, 'success');
  };

  const chartData = useMemo(() => {
    if (!savedReports.length) return [];
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const dataMap = {};
    last7Days.forEach(date => dataMap[date] = { date, reports: 0, words: 0 });
    savedReports.forEach(r => {
      const d = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dataMap[d]) {
        dataMap[d].reports += 1;
        dataMap[d].words += r.word_count || 0;
      }
    });
    return Object.values(dataMap);
  }, [savedReports]);

  const usersData = useMemo(() => {
    const userMap = {};
    dbUsers.forEach(u => {
      userMap[u.email] = { name: u.name, email: u.email, reports: 0, totalWords: 0, lastActive: u.created_at, is_suspended: u.is_suspended, createdAt: u.created_at };
    });
    savedReports.forEach(r => {
      const email = r.user_id;
      if (!userMap[email]) {
        userMap[email] = { name: 'Unknown', email, reports: 0, totalWords: 0, lastActive: r.created_at, is_suspended: false, createdAt: r.created_at };
      }
      userMap[email].reports += 1;
      userMap[email].totalWords += (r.word_count || 0);
      if (new Date(r.created_at) > new Date(userMap[email].lastActive)) {
        userMap[email].lastActive = r.created_at;
      }
    });
    
    let arr = Object.values(userMap);
    if (userSort === 'reports_high') arr.sort((a,b) => b.reports - a.reports);
    else if (userSort === 'newest') arr.sort((a,b) => new Date(b.lastActive) - new Date(a.lastActive));
    else if (userSort === 'name_asc') arr.sort((a,b) => (a.name||a.email).localeCompare(b.name||b.email));
    
    return arr;
  }, [savedReports, dbUsers, userSort]);

  const sortedReports = useMemo(() => {
    let arr = [...savedReports];
    if (auditSort === 'newest') arr.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    else if (auditSort === 'oldest') arr.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    else if (auditSort === 'words_high') arr.sort((a,b) => (b.word_count||0) - (a.word_count||0));
    return arr;
  }, [savedReports, auditSort]);

  const currentAuditReports = sortedReports.slice((auditPage - 1) * auditPerPage, auditPage * auditPerPage);
  const auditTotalPages = Math.ceil(sortedReports.length / auditPerPage);

  const currentUsers = usersData.slice((usersPage - 1) * usersPerPage, usersPage * usersPerPage);
  const usersTotalPages = Math.ceil(usersData.length / usersPerPage);


  if (isLoading) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#020617', color: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
      
      {/* EXTREME AMBIENT GLOW EFFECTS */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(120px)', pointerEvents: 'none' }} />

      {/* ─── MAC-STYLE LOGIN SCREEN ─── */}
      <AnimatePresence mode="wait">
        {!isAdminLoggedIn && (
          <motion.div 
            key="login" 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, filter: 'blur(20px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <TiltCard style={{ width: '100%', maxWidth: '420px' }}>
              <div style={{ 
                width: '100%', padding: '3.5rem 2.5rem', textAlign: 'center', borderRadius: '30px', 
                background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)', 
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)', 
                backdropFilter: 'blur(50px)', WebkitBackdropFilter: 'blur(50px)' 
              }}>
                <div style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', borderRadius: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 35px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)' }}>
                  <Shield size={36} color="#fff" strokeWidth={2.5} />
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '0.5rem', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Admin Core</h1>
                <p style={{ color: '#94a3b8', marginBottom: '3rem', fontSize: '0.9rem' }}>Enterprise Access Required</p>

                <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
                  <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
                    <Users size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input type="email" placeholder="Admin E-Mail" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} onFocus={(e) => {e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(0,0,0,0.5)'}} onBlur={(e) => {e.target.style.borderColor = 'rgba(255,255,255,0.05)'; e.target.style.background = 'rgba(0,0,0,0.3)'}} />
                  </div>
                  
                  <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input type="password" placeholder="Master Key" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} onFocus={(e) => {e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(0,0,0,0.5)'}} onBlur={(e) => {e.target.style.borderColor = 'rgba(255,255,255,0.05)'; e.target.style.background = 'rgba(0,0,0,0.3)'}} />
                  </div>
                  
                  <button type="submit" style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)', color: '#020617', border: 'none', borderRadius: '16px', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', transition: 'transform 0.1s, opacity 0.2s, box-shadow 0.3s', boxShadow: '0 10px 25px rgba(255,255,255,0.2)' }} onMouseDown={(e) => e.target.style.transform = 'scale(0.97)'} onMouseUp={(e) => e.target.style.transform = 'scale(1)'}>
                    Initialize Session
                  </button>
                </form>
              </div>
            </TiltCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ULTIMATE MAC-STYLE DASHBOARD ─── */}
      {isAdminLoggedIn && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} style={{ display: 'flex', flex: 1, overflow: 'hidden', zIndex: 10 }}>
          
          {/* SIDEBAR */}
          <div style={{ width: '280px', background: 'rgba(15, 23, 42, 0.4)', borderRight: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(40px)', display: 'flex', flexDirection: 'column', paddingTop: '2.5rem', zIndex: 20 }}>
            <div style={{ padding: '0 1.5rem', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)' }}>
                  <Shield size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>AssignAI Admin</h3>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                    Network Active
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, padding: '0 1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Workspace</p>
              
              {[
                { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
                { id: 'users', label: 'Identities', icon: <Users size={18} /> },
                { id: 'health', label: 'System Health', icon: <Activity size={18} /> },
                { id: 'settings', label: 'System Config', icon: <Settings size={18} /> }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.85rem 1rem', background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', borderRadius: '12px', color: isActive ? '#fff' : '#64748b', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', marginBottom: '0.4rem', overflow: 'hidden' }}>
                    {isActive && <motion.div layoutId="sidebar-active" style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} />}
                    <div style={{ zIndex: 1, color: isActive ? '#10b981' : 'currentColor' }}>{tab.icon}</div>
                    <span style={{ zIndex: 1 }}>{tab.label}</span>
                  </button>
                )
              })}

              <button onClick={() => setIsSearchOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '12px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Search size={16} /> Spotlight
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#cbd5e1' }}>⌘K</div>
              </button>
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={handleLogout} style={{ width: '100%', padding: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}>
                Terminate Session
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            {/* Topbar */}
            <div style={{ height: '72px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 2.5rem', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.2)', backdropFilter: 'blur(30px)', zIndex: 10 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {activeTab === 'dashboard' ? 'System Overview' : activeTab === 'users' ? 'Identity Management' : activeTab === 'health' ? 'Observability' : 'System Configuration'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <Clock size={14} />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                <button onClick={() => window.location.href = '/'} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} onMouseOver={(e) => {e.target.style.background = 'rgba(255,255,255,0.2)'; e.target.style.transform = 'translateY(-1px)'}} onMouseOut={(e) => {e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.transform = 'translateY(0)'}}>
                  Launch Web App ↗
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem' }}>
              
              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                  {/* BENTO GRID */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    
                    <TiltCard className="bento-widget" style={{ gridColumn: 'span 4' }}>
                      <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.8rem', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(20px)' }} />
                        <Activity color="#10b981" size={24} style={{ marginBottom: '1rem' }} />
                        <h4 style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Core Engine</h4>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-1px' }}>Optimal</div>
                        <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                          <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Ping</div>
                            <div style={{ fontSize: '1rem', color: '#10b981', fontWeight: 700 }}>{ping}</div>
                          </div>
                          <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Uptime</div>
                            <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 700 }}>99.9%</div>
                          </div>
                        </div>
                      </div>
                    </TiltCard>

                    <TiltCard className="bento-widget" style={{ gridColumn: 'span 4' }}>
                      <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.8rem', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.5rem', zIndex: 1 }}>Docs Compiled</h4>
                        <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#fff', zIndex: 1, letterSpacing: '-2px' }}>{stats.reports}</div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', opacity: 0.4, zIndex: 0 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="reports" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReports)" strokeWidth={4} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </TiltCard>

                    <TiltCard className="bento-widget" style={{ gridColumn: 'span 4' }}>
                      <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '24px', padding: '1.8rem', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 20px 40px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <FileText size={18} color="#10b981" />
                          <h4 style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Tokens Rendered</h4>
                        </div>
                        <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-1px', textShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>{stats.words.toLocaleString()}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 'auto', fontWeight: 500 }}>Cumulative AI output across network.</div>
                      </div>
                    </TiltCard>
                  </div>

                  {/* RECENT ACTIVITY WITH SORTING */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Global Audit Log</h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select value={auditSort} onChange={e => setAuditSort(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}>
                          <option value="newest">Sort: Newest First</option>
                          <option value="oldest">Sort: Oldest First</option>
                          <option value="words_high">Sort: Highest Words</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <tr>
                            <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Identity</th>
                            <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Document Task</th>
                            <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Timestamp</th>
                            <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Tokens</th>
                            <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentAuditReports.map((r, i) => (
                            <tr key={r.id || i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                              <td style={{ padding: '1.2rem 1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                                    {r.user_id?.charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontSize: '0.95rem', color: '#e2e8f0', fontWeight: 600 }}>{r.user_id}</span>
                                </div>
                              </td>
                              <td style={{ padding: '1.2rem 1.5rem', color: '#cbd5e1', fontSize: '0.95rem', fontWeight: 500 }}>
                                {r.assignment_title && r.assignment_title.length > 40 ? r.assignment_title.substring(0,40)+'...' : r.assignment_title || 'Untitled Generation'}
                              </td>
                              <td style={{ padding: '1.2rem 1.5rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                {new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>
                                +{r.word_count?.toLocaleString()}
                              </td>
                              <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                <button onClick={() => setViewingReport(r)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '5px' }}>
                                  <Eye size={18} />
                                </button>
                                <button onClick={() => deleteReport(r.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px', marginLeft: '10px' }}>
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {auditTotalPages > 1 && (
                        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <button disabled={auditPage === 1} onClick={() => setAuditPage(p => p - 1)} style={{ padding: '5px 15px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#fff', cursor: auditPage === 1 ? 'not-allowed' : 'pointer', opacity: auditPage === 1 ? 0.5 : 1 }}>Prev</button>
                          <span style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>Page {auditPage} of {auditTotalPages}</span>
                          <button disabled={auditPage === auditTotalPages} onClick={() => setAuditPage(p => p + 1)} style={{ padding: '5px 15px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#fff', cursor: auditPage === auditTotalPages ? 'not-allowed' : 'pointer', opacity: auditPage === auditTotalPages ? 0.5 : 1 }}>Next</button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SYSTEM HEALTH TAB */}
              {activeTab === 'health' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div style={{ gridColumn: 'span 4', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <Cpu size={20} color="#3b82f6" /> <span style={{ fontWeight: 600 }}>CPU Usage</span>
                        </div>
                        <span style={{ color: '#3b82f6', fontWeight: 800 }}>{sysHealth[sysHealth.length-1].cpu.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '100px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sysHealth}>
                            <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={3} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 4', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <HardDrive size={20} color="#10b981" /> <span style={{ fontWeight: 600 }}>Memory Allocation</span>
                        </div>
                        <span style={{ color: '#10b981', fontWeight: 800 }}>{sysHealth[sysHealth.length-1].ram.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '100px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sysHealth}>
                            <Line type="monotone" dataKey="ram" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 4', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <Network size={20} color="#f59e0b" /> <span style={{ fontWeight: 600 }}>Network Traffic</span>
                        </div>
                        <span style={{ color: '#f59e0b', fontWeight: 800 }}>{sysHealth[sysHealth.length-1].net.toFixed(1)} mbps</span>
                      </div>
                      <div style={{ height: '100px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sysHealth}>
                            <Line type="monotone" dataKey="net" stroke="#f59e0b" strokeWidth={3} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* USERS TAB */}
              {activeTab === 'users' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                  <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 180px)' }}>
                    
                    {/* Left Pane - User List */}
                    <div style={{ width: '380px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
                      <div style={{ padding: '1.5rem 1.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Identities</h3>
                          <select value={userSort} onChange={e => setUserSort(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', outline: 'none' }}>
                            <option value="reports_high">Sort: Reports</option>
                            <option value="newest">Sort: Active</option>
                            <option value="name_asc">Sort: A-Z</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        {currentUsers.map((u, i) => (
                          <div key={i} onClick={() => setSelectedUser(u)} style={{ padding: '1.2rem 1.8rem', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '1.2rem', cursor: 'pointer', transition: 'all 0.2s', background: selectedUser?.email === u.email ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderLeft: selectedUser?.email === u.email ? '4px solid #3b82f6' : '4px solid transparent' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: u.is_suspended ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: u.is_suspended ? 'none' : '0 4px 10px rgba(59, 130, 246, 0.4)', color: u.is_suspended ? '#ef4444' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                              {u.name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: u.is_suspended ? '#94a3b8' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: u.is_suspended ? 'line-through' : 'none' }}>{u.name || 'Unknown Agent'}</div>
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>{u.email}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <div style={{ fontSize: '1.2rem', color: u.is_suspended ? '#ef4444' : '#10b981', fontWeight: 800 }}>{u.reports}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {usersTotalPages > 1 && (
                        <div style={{ padding: '0.8rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                          <button disabled={usersPage === 1} onClick={() => setUsersPage(p => p - 1)} style={{ padding: '5px 10px', background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>&larr; Prev</button>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', alignSelf: 'center' }}>{usersPage} / {usersTotalPages}</span>
                          <button disabled={usersPage === usersTotalPages} onClick={() => setUsersPage(p => p + 1)} style={{ padding: '5px 10px', background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>Next &rarr;</button>
                        </div>
                      )}
                    </div>

                    {/* Right Pane - DOSSIER */}
                    <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)' }}>
                      {!selectedUser ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '3rem' }}>
                          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.02)' }}>
                            <Users size={40} color="#475569" strokeWidth={1.5} />
                          </div>
                          <h3 style={{ color: '#f8fafc', fontSize: '1.4rem', marginBottom: '0.8rem', fontWeight: 700 }}>Select Identity Profile</h3>
                          <p style={{ color: '#64748b', maxWidth: '350px', fontSize: '0.95rem', lineHeight: 1.6 }}>Detailed analytics, document history, and administrative access controls will initialize here.</p>
                        </div>
                      ) : (
                        <motion.div key={selectedUser.email} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                          {/* Profile Header */}
                          <div style={{ padding: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)', position: 'relative' }}>
                            {selectedUser.is_suspended && (
                              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                <ShieldAlert size={14} /> SUSPENDED
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: selectedUser.is_suspended ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)', border: selectedUser.is_suspended ? '2px solid #ef4444' : 'none' }}>
                                {selectedUser.name?.charAt(0).toUpperCase() || selectedUser.email.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <h2 style={{ margin: '0 0 0.5rem', fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{selectedUser.name || 'Unknown User'}</h2>
                                <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem', fontWeight: 500 }}>{selectedUser.email}</p>
                              </div>
                              <div>
                                <button onClick={() => impersonateUser(selectedUser)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <ExternalLink size={16} /> Impersonate
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ flex: 1, padding: '1.5rem', borderRight: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' }}>Total Reports</div>
                              <div style={{ fontSize: '2rem', color: '#fff', fontWeight: 800 }}>{selectedUser.reports}</div>
                            </div>
                            <div style={{ flex: 1, padding: '1.5rem', borderRight: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' }}>Words</div>
                              <div style={{ fontSize: '2rem', color: '#10b981', fontWeight: 800 }}>{selectedUser.totalWords.toLocaleString()}</div>
                            </div>
                            <div style={{ flex: 1, padding: '1.5rem', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.5rem' }}>Last Active</div>
                              <div style={{ fontSize: '1.1rem', color: '#e2e8f0', fontWeight: 700, marginTop: '0.5rem' }}>{new Date(selectedUser.lastActive).toLocaleDateString()}</div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => suspendUser(selectedUser.email, selectedUser.is_suspended)} style={{ flex: 1, padding: '12px', background: selectedUser.is_suspended ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: `1px solid ${selectedUser.is_suspended ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`, color: selectedUser.is_suspended ? '#10b981' : '#f59e0b', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                              <PowerOff size={18} /> {selectedUser.is_suspended ? 'Restore Access' : 'Suspend Account'}
                            </button>
                            <button onClick={() => deleteUser(selectedUser.email)} style={{ flex: 1, padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                              <Trash2 size={18} /> Delete Account
                            </button>
                          </div>

                          {/* Activity Timeline & Reports */}
                          <div style={{ padding: '2rem', flex: 1 }}>
                            <h4 style={{ margin: '0 0 1.5rem', fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>Activity Timeline</h4>
                            <div style={{ borderLeft: '2px solid rgba(255,255,255,0.1)', marginLeft: '10px', paddingLeft: '20px', position: 'relative' }}>
                              {/* Fake Signup Event */}
                              <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-27px', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', border: '2px solid #0f172a' }} />
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>{new Date(selectedUser.createdAt || Date.now()).toLocaleString()}</div>
                                <div style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>Account Verified & Initialized</div>
                              </div>
                              {/* Actual Reports */}
                              {savedReports.filter(r => r.user_id === selectedUser.email).map((r, idx) => (
                                <div key={idx} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                  <div style={{ position: 'absolute', left: '-27px', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid #0f172a' }} />
                                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>{new Date(r.created_at).toLocaleString()}</div>
                                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>Generated: {r.assignment_title || 'Untitled'}</div>
                                      <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>+{r.word_count} tokens</div>
                                    </div>
                                    <button onClick={() => setViewingReport(r)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                      <Eye size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                  </div>
                </motion.div>
              )}

              {/* SYSTEM CONFIGURATION TAB */}
              {activeTab === 'settings' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '3rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)' }}>
                        <Database size={24} color="#fff" />
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Data Management</h2>
                        <p style={{ margin: '0.2rem 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Export network logs and configure system parameters.</p>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
                      <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', color: '#f8fafc' }}>Database Exports</h3>
                      <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <button onClick={() => exportCSV('users')} style={{ flex: 1, padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', color: '#60a5fa', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(59, 130, 246, 0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(59, 130, 246, 0.1)'}>
                          <Download size={24} /> Export Identities (CSV)
                        </button>
                        <button onClick={() => exportCSV('reports')} style={{ flex: 1, padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', color: '#34d399', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(16, 185, 129, 0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(16, 185, 129, 0.1)'}>
                          <Download size={24} /> Export Documents (CSV)
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </div>
          </div>
        </motion.div>
      )}

      {/* ─── ENTERPRISE A4 REPORT VIEWER MODAL ─── */}
      <AnimatePresence>
        {viewingReport && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
            onClick={() => setViewingReport(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }}
              style={{ width: '100%', maxWidth: '1000px', height: '90vh', background: '#e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Toolbar */}
              <div style={{ padding: '1rem 2rem', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>{viewingReport.assignment_title || 'Untitled Report'}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>{viewingReport.user_id} • {viewingReport.word_count} words</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Download size={16} /> Print/PDF</button>
                  <button onClick={() => setViewingReport(null)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#f87171', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                </div>
              </div>
              
              {/* Document Container (A4 Render) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 2rem', background: '#e2e8f0', display: 'flex', justifyContent: 'center' }}>
                <div 
                  className="report-content"
                  style={{ 
                    background: '#fff', 
                    color: '#000', 
                    width: '100%', 
                    maxWidth: '210mm', 
                    minHeight: '297mm', 
                    padding: '2.5cm', 
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    fontFamily: '"Times New Roman", Times, serif',
                    lineHeight: '1.6',
                    fontSize: '12pt',
                    margin: '0 auto'
                  }} 
                  dangerouslySetInnerHTML={{ __html: viewingReport.html_content }} 
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style dangerouslySetInnerHTML={{__html: `
        .report-content h1 { font-size: 24pt; font-weight: bold; text-align: center; margin-bottom: 24pt; color: #000; font-family: "Times New Roman", Times, serif; }
        .report-content h2 { font-size: 18pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; color: #000; font-family: "Times New Roman", Times, serif; }
        .report-content h3 { font-size: 14pt; font-weight: bold; margin-top: 18pt; margin-bottom: 8pt; color: #000; font-family: "Times New Roman", Times, serif; }
        .report-content p { margin-bottom: 12pt; text-align: justify; color: #000; font-family: "Times New Roman", Times, serif; }
        .report-content ul, .report-content ol { margin-bottom: 12pt; padding-left: 24pt; color: #000; font-family: "Times New Roman", Times, serif; }
        .report-content li { margin-bottom: 6pt; }
        .report-content strong { font-weight: bold; }
        @media print {
          body * { visibility: hidden; }
          .report-content, .report-content * { visibility: visible; }
          .report-content { position: absolute; left: 0; top: 0; margin: 0; padding: 2cm; width: 100%; box-shadow: none; }
        }
      `}} />

      {/* TOASTS */}
      <div className="toast-container" style={{ zIndex: 9999 }}>
        {toasts.map(t => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={t.id} className={`toast ${t.type}`} style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', border: `1px solid ${t.type === 'success' ? '#10b981' : '#ef4444'}`, padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: t.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
              {t.type === 'success' ? <CheckCircle2 size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
            </div>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{t.msg}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
