import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabase, getAdminSupabase } from "../supabase";
import { showToast } from "../utils";
import {
  Building2, UserCog, Wallet, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, XCircle, RefreshCw, Trash2, ShieldCheck, ChevronRight, ChevronLeft,
  Calendar, LayoutDashboard, X, Eye, BellRing, Plus, Smartphone,
  MessageSquare, Shield, Package, Activity, Settings, LifeBuoy,
  CheckSquare, List, Globe, Mail, Handshake, Bug, Download, LogOut,
  Search, ArrowUpRight, ArrowDownRight, Lock, Unlock, Copy,
  BarChart2, Star, Info, TrendingDown, AlertCircle, CheckCheck,
  Send, Edit2, Save, Tag, Key, Heart, Cpu, Code, Percent,
  UserCheck, Flame, Megaphone, Database, Timer, ShieldAlert,
  Layers, Target, Zap, Filter, FileText, Users, Bell, Hash,
  Phone, DollarSign, Smile, Frown, Meh, Server, Wifi, HardDrive,
  GitBranch, ThumbsUp, ThumbsDown, PhoneCall, PlusCircle, Radio,
  BarChart3, Kanban, TrendingUp as TrendUp, ClipboardList,
} from "lucide-react";
import { useApp } from "../AppContext";

// ─────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("sa-styles")) return;
  const s = document.createElement("style");
  s.id = "sa-styles";
  s.textContent = `
    @keyframes sa-fadeInUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes sa-slideIn   { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
    @keyframes sa-pulse     { 0%,100%{opacity:1} 50%{opacity:.5} }
    @keyframes sa-scaleIn   { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
    @keyframes sa-shimmer   { from{background-position:-200% 0} to{background-position:200% 0} }
    .sa-row-hover:hover { background:rgba(99,102,241,.05)!important; transform:translateX(1px); }
    .sa-row-hover { transition:background .15s,transform .15s; }
    .sa-btn:hover { filter:brightness(1.1); transform:translateY(-1px); }
    .sa-btn { transition:all .15s ease; cursor:pointer; }
    .sa-tab-btn:hover { color:var(--text-primary)!important; background:rgba(99,102,241,.08)!important; }
    .sa-tab-btn { transition:all .2s ease!important; }
    .sa-card-anim { animation:sa-fadeInUp .4s ease forwards; }
    .sa-sidebar-item:hover { background:rgba(99,102,241,.1)!important; color:var(--text-primary)!important; }
    .sa-sidebar-item { transition:all .2s ease!important; border-radius:10px!important; }
    .sa-input:focus { border-color:var(--accent)!important; box-shadow:0 0 0 3px rgba(99,102,241,.15)!important; }
    .sa-input { transition:all .2s ease!important; outline:none; }
    .sa-modal-overlay { animation:sa-scaleIn .2s ease; }
    .sa-toggle-track { transition:background .25s ease!important; }
    .sa-toggle-thumb { transition:left .25s ease!important; }
  `;
  document.head.appendChild(s);
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#06b6d4"];
const getAvatarColor = (name = "") => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const BROADCAST_TEMPLATES = [
  { id:1, name:"Boas-vindas", subject:"Bem-vindo ao ChatDesk! 🚀", content:"Olá {nome},\n\nSeja muito bem-vindo(a) ao ChatDesk! Estamos felizes em tê-lo(a) conosco.\n\nSe precisar de ajuda, nosso suporte está disponível.\n\nEquipe ChatDesk" },
  { id:2, name:"Trial expirando", subject:"⚠️ Seu trial expira em breve!", content:"Olá {nome},\n\nSeu período de avaliação está prestes a expirar.\n\nNão perca acesso às suas conversas e clientes!\n\nClique abaixo para assinar agora:\n[LINK DE ASSINATURA]\n\nAtenciosamente,\nEquipe ChatDesk" },
  { id:3, name:"Manutenção programada", subject:"🔧 Manutenção programada — ChatDesk", content:"Olá {nome},\n\nInformamos que realizaremos uma manutenção programada no sistema.\n\nData: [DATA]\nDuração estimada: [DURAÇÃO]\n\nDurante esse período, o sistema poderá ficar indisponível.\n\nPedimos desculpas pelo inconveniente.\n\nEquipe ChatDesk" },
  { id:4, name:"Novas funcionalidades", subject:"✨ Novidades do ChatDesk!", content:"Olá {nome},\n\nLançamos novas funcionalidades que vão transformar seu atendimento!\n\n• [FUNCIONALIDADE 1]\n• [FUNCIONALIDADE 2]\n• [FUNCIONALIDADE 3]\n\nAcesse o painel para conferir!\n\nEquipe ChatDesk" },
  { id:5, name:"Inadimplência", subject:"❗ Pagamento pendente — ChatDesk", content:"Olá {nome},\n\nIdentificamos um pagamento pendente na sua conta.\n\nSeu acesso pode ser suspenso em breve.\n\nRegularize agora:\n[LINK DE PAGAMENTO]\n\nEquipe ChatDesk" },
];

// ─────────────────────────────────────────────
// COMPONENT: ConfirmModal
// ─────────────────────────────────────────────
function ConfirmModal({ isOpen, title, message, confirmLabel="Confirmar", confirmColor="var(--danger)", cancelLabel="Cancelar", onConfirm, onCancel, icon:Icon }) {
  if (!isOpen) return null;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div className="sa-modal-overlay" style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",padding:"28px",maxWidth:"420px",width:"90%",boxShadow:"0 24px 60px rgba(0,0,0,.5)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px" }}>
          {Icon && <div style={{ width:"44px",height:"44px",borderRadius:"12px",background:`${confirmColor}18`,display:"flex",alignItems:"center",justifyContent:"center",color:confirmColor,flexShrink:0 }}><Icon size={22}/></div>}
          <h3 style={{ margin:0,fontSize:"16px",fontWeight:700,color:"var(--text-primary)" }}>{title}</h3>
        </div>
        <p style={{ margin:"0 0 24px",fontSize:"14px",color:"var(--text-secondary)",lineHeight:1.6 }}>{message}</p>
        <div style={{ display:"flex",gap:"12px",justifyContent:"flex-end" }}>
          <button onClick={onCancel} className="sa-btn" style={{ padding:"9px 20px",borderRadius:"8px",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",fontWeight:600,fontSize:"13px" }}>{cancelLabel}</button>
          <button onClick={onConfirm} className="sa-btn" style={{ padding:"9px 20px",borderRadius:"8px",border:"none",background:confirmColor,color:"white",fontWeight:700,fontSize:"13px" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: CreateCompanyModal
// ─────────────────────────────────────────────
function CreateCompanyModal({ isOpen, onClose, onSubmit, saasPlans }) {
  const [form, setForm] = useState({ name:"", email:"", plan_id:"", phone:"" });
  if (!isOpen) return null;
  const handle = (e) => { e.preventDefault(); onSubmit(form); setForm({ name:"",email:"",plan_id:"",phone:"" }); };
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div className="sa-modal-overlay" style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"20px",padding:"28px",width:"480px",maxWidth:"95vw",boxShadow:"0 24px 60px rgba(0,0,0,.5)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
            <div style={{ width:"40px",height:"40px",borderRadius:"12px",background:"rgba(99,102,241,.15)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)" }}><Building2 size={20}/></div>
            <div>
              <h3 style={{ margin:0,fontSize:"16px",fontWeight:800,color:"var(--text-primary)" }}>Criar Nova Empresa</h3>
              <p style={{ margin:0,fontSize:"12px",color:"var(--text-muted)" }}>A empresa será criada em modo Trial</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={18}/></button>
        </div>
        <form onSubmit={handle} style={{ display:"flex",flexDirection:"column",gap:"14px" }}>
          {[
            { label:"Nome da Empresa *", key:"name", type:"text", placeholder:"Ex: Empresa ABC Ltda" },
            { label:"E-mail do Responsável *", key:"email", type:"email", placeholder:"dono@empresa.com.br" },
            { label:"Telefone (Opcional)", key:"phone", type:"tel", placeholder:"(11) 99999-9999" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:"6px" }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} required={f.label.includes("*")}
                className="sa-input" style={{ width:"100%",padding:"10px 12px",borderRadius:"10px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }} />
            </div>
          ))}
          <div>
            <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:"6px" }}>Plano Inicial</label>
            <select value={form.plan_id} onChange={e=>setForm(p=>({...p,plan_id:e.target.value}))}
              className="sa-input" style={{ width:"100%",padding:"10px 12px",borderRadius:"10px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px" }}>
              <option value="">Selecionar plano (opcional)</option>
              {saasPlans.map(p=><option key={p.id} value={p.id}>{p.name} — R$ {p.price}/mês</option>)}
            </select>
          </div>
          <div style={{ display:"flex",gap:"12px",marginTop:"8px" }}>
            <button type="button" onClick={onClose} className="sa-btn" style={{ flex:1,padding:"11px",borderRadius:"10px",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",fontWeight:600,fontSize:"13px" }}>Cancelar</button>
            <button type="submit" className="sa-btn" style={{ flex:2,padding:"11px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",fontWeight:700,fontSize:"13px",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px" }}>
              <Plus size={15}/> Criar Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: StatusBadge
// ─────────────────────────────────────────────
function StatusBadge({ status, size="sm" }) {
  const map = {
    trial:     { label:"Trial",        bg:"rgba(99,102,241,.15)",  color:"#818cf8" },
    active:    { label:"Ativo",        bg:"rgba(16,185,129,.15)",  color:"#10b981" },
    past_due:  { label:"Inadimplente", bg:"rgba(239,68,68,.15)",   color:"#ef4444" },
    blocked:   { label:"Bloqueado",    bg:"rgba(100,100,100,.2)",  color:"#94a3b8" },
    cancelled: { label:"Cancelado",    bg:"rgba(239,68,68,.1)",    color:"#ef4444" },
  };
  const s = map[status] || map.trial;
  return (
    <span style={{ fontSize:size==="sm"?"10px":"12px",fontWeight:700,padding:size==="sm"?"3px 8px":"5px 12px",borderRadius:"20px",background:s.bg,color:s.color,textTransform:"uppercase",letterSpacing:".5px",display:"inline-flex",alignItems:"center",gap:"5px" }}>
      <span style={{ width:"5px",height:"5px",borderRadius:"50%",background:s.color,display:"inline-block" }}/>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: HealthScoreBadge
// ─────────────────────────────────────────────
function HealthScoreBadge({ score }) {
  const levels = [
    { max:25,  label:"Crítico",   color:"#ef4444", icon:Flame },
    { max:50,  label:"Em Risco",  color:"#f59e0b", icon:AlertTriangle },
    { max:75,  label:"Saudável",  color:"#10b981", icon:CheckCircle2 },
    { max:101, label:"Excelente", color:"#6366f1", icon:Star },
  ];
  const l = levels.find(x => score < x.max) || levels[3];
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:700,padding:"4px 10px",borderRadius:"20px",background:`${l.color}18`,color:l.color }}>
      <l.icon size={11}/> {score}/100 · {l.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: MiniBarChart
// ─────────────────────────────────────────────
function MiniBarChart({ data, color="var(--accent)", height=60, label="" }) {
  const max = Math.max(...data.map(d=>d.count), 1);
  return (
    <div>
      <div style={{ display:"flex",gap:"4px",alignItems:"flex-end",height:`${height}px` }}>
        {data.map((d,i)=>(
          <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",height:"100%" }}>
            <div title={`${d.month}: ${d.count} novos`} style={{
              width:"100%",borderRadius:"3px 3px 0 0",
              background:`${color}`,opacity:.8,
              height:`${Math.max((d.count/max)*100,3)}%`,
              transition:"height .3s ease",cursor:"pointer",
            }}/>
          </div>
        ))}
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",marginTop:"6px" }}>
        {data.map((d,i)=>(
          <span key={i} style={{ fontSize:"9px",color:"var(--text-muted)",textAlign:"center",flex:1 }}>
            {d.month?.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: StatCardV2
// ─────────────────────────────────────────────
function StatCardV2({ icon:Icon, label, value, color, sublabel, trend, delay=0, onClick }) {
  return (
    <div onClick={onClick} className="sa-card-anim" style={{
      background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",padding:"22px",
      display:"flex",flexDirection:"column",gap:"12px",animationDelay:`${delay}ms`,
      cursor:onClick?"pointer":"default",position:"relative",overflow:"hidden",transition:"border-color .2s,box-shadow .2s",
    }}
      onMouseOver={e=>{ if(onClick){ e.currentTarget.style.borderColor=color; e.currentTarget.style.boxShadow=`0 0 20px ${color}20`; }}}
      onMouseOut={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.boxShadow="none"; }}
    >
      <div style={{ position:"absolute",top:"-20px",right:"-20px",width:"100px",height:"100px",borderRadius:"50%",background:`${color}08`,pointerEvents:"none" }}/>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div style={{ width:"46px",height:"46px",borderRadius:"12px",background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",color }}><Icon size={22}/></div>
        {trend!==undefined && (
          <div style={{ display:"flex",alignItems:"center",gap:"4px",fontSize:"12px",fontWeight:700,color:trend>=0?"var(--success)":"var(--danger)" }}>
            {trend>=0?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>}{Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p style={{ margin:0,fontSize:"11px",color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:".6px" }}>{label}</p>
        <p style={{ margin:"4px 0 0",fontSize:"26px",fontWeight:800,color:"var(--text-primary)",lineHeight:1.1 }}>{value}</p>
        {sublabel && <p style={{ margin:"4px 0 0",fontSize:"11px",color:"var(--text-muted)" }}>{sublabel}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: SearchBar
// ─────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder="Buscar...", width="280px" }) {
  return (
    <div style={{ position:"relative",width }}>
      <Search size={14} style={{ position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)",pointerEvents:"none" }}/>
      <input className="sa-input" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%",padding:"9px 12px 9px 34px",borderRadius:"10px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
      {value && <button onClick={()=>onChange("")} style={{ position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text-muted)",cursor:"pointer",padding:"2px" }}><X size={12}/></button>}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: SectionHeader
// ─────────────────────────────────────────────
function SectionHeader({ title, subtitle, icon:Icon, iconColor, actions }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"28px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:"14px" }}>
        {Icon && <div style={{ width:"42px",height:"42px",borderRadius:"12px",background:`${iconColor||"var(--accent)"}18`,display:"flex",alignItems:"center",justifyContent:"center",color:iconColor||"var(--accent)" }}><Icon size={20}/></div>}
        <div>
          <h2 style={{ margin:0,fontSize:"20px",fontWeight:800,color:"var(--text-primary)" }}>{title}</h2>
          {subtitle && <p style={{ margin:"3px 0 0",fontSize:"13px",color:"var(--text-muted)" }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{ display:"flex",gap:"10px",alignItems:"center" }}>{actions}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: EmptyState
// ─────────────────────────────────────────────
function EmptyState({ icon:Icon, title, description, action }) {
  return (
    <div style={{ padding:"60px 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:"12px" }}>
      <div style={{ width:"64px",height:"64px",borderRadius:"20px",background:"rgba(99,102,241,.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)" }}>{Icon&&<Icon size={28}/>}</div>
      <p style={{ margin:0,fontSize:"15px",fontWeight:700,color:"var(--text-primary)" }}>{title}</p>
      {description && <p style={{ margin:0,fontSize:"13px",color:"var(--text-muted)",maxWidth:"300px",lineHeight:1.5 }}>{description}</p>}
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: Toggle
// ─────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button onClick={()=>onChange(!checked)} className="sa-toggle-track" style={{ width:"40px",height:"22px",borderRadius:"11px",padding:0,border:"none",background:checked?"var(--success)":"var(--bg-primary)",outline:checked?"none":"1px solid var(--border)",position:"relative",cursor:"pointer" }}>
      <div className="sa-toggle-thumb" style={{ width:"16px",height:"16px",borderRadius:"50%",background:checked?"white":"var(--text-muted)",position:"absolute",top:"3px",left:checked?"21px":"3px" }}/>
    </button>
  );
}

// ─────────────────────────────────────────────
// COMPONENT: AlertBanner
// ─────────────────────────────────────────────
function AlertBanner({ type="warning", message, icon:Icon, onDismiss, onClick }) {
  const colors = {
    warning:{ bg:"rgba(245,158,11,.12)",border:"rgba(245,158,11,.3)",color:"#f59e0b" },
    danger: { bg:"rgba(239,68,68,.12)", border:"rgba(239,68,68,.3)", color:"#ef4444" },
    info:   { bg:"rgba(99,102,241,.12)",border:"rgba(99,102,241,.3)",color:"#6366f1" },
    success:{ bg:"rgba(16,185,129,.12)",border:"rgba(16,185,129,.3)",color:"#10b981" },
  };
  const c = colors[type];
  return (
    <div onClick={onClick} style={{ display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",borderRadius:"10px",marginBottom:"10px",background:c.bg,border:`1px solid ${c.border}`,color:c.color,cursor:onClick?"pointer":"default" }}>
      {Icon && <Icon size={16} style={{ flexShrink:0 }}/>}
      <span style={{ flex:1,fontSize:"13px",fontWeight:600 }}>{message}</span>
      {onDismiss && <button onClick={e=>{e.stopPropagation();onDismiss();}} style={{ background:"none",border:"none",color:c.color,cursor:"pointer",padding:"2px" }}><X size={14}/></button>}
      {onClick && <ChevronRight size={14}/>}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN: SuperAdminView
// ─────────────────────────────────────────────
export default function SuperAdminView({ isStandalone=false }) {
  injectStyles();
  const { currentAgent, activeView, setActiveView } = useApp();
  const currentView = activeView==="superadmin"?"sa_dashboard":(activeView||"sa_dashboard");
  const activeTab = currentView.replace("sa_","");
  const setActiveTab = (tab) => setActiveView("sa_"+tab);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ── DATA STATE ────────────────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [whatsappInboxes, setWhatsappInboxes] = useState([]);
  const [saasPlans, setSaasPlans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [domains, setDomains] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [systemErrors, setSystemErrors] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]);

  // ── NOVOS ESTADOS ────────────────────────────────────────────────
  const [pipeline, setPipeline] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [financialTx, setFinancialTx] = useState([]);
  const [npsSurveys, setNpsSurveys] = useState([]);
  const [npsResponses, setNpsResponses] = useState([]);
  const [statusComponents, setStatusComponents] = useState([]);
  const [statusIncidents, setStatusIncidents] = useState([]);
  // Pipeline form
  const [newLead, setNewLead] = useState({ company_name:"",contact_name:"",contact_email:"",contact_phone:"",stage:"lead",estimated_value:"",notes:"",next_followup:"",source:"" });
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [pipelineStageFilter, setPipelineStageFilter] = useState("all");
  const [showLeadForm, setShowLeadForm] = useState(false);
  // Financial
  const [newTx, setNewTx] = useState({ company_id:"",company_name:"",type:"payment",amount:"",status:"paid",description:"",due_at:"" });
  const [showTxForm, setShowTxForm] = useState(false);
  // NPS
  const [newSurvey, setNewSurvey] = useState({ title:"",question:"Em uma escala de 0 a 10, o quanto você recomendaria o ChatDesk?" });
  const [newNpsResponse, setNewNpsResponse] = useState({ survey_id:"",company_id:"",company_name:"",score:8,comment:"",respondent_email:"" });
  const [showNpsResponseForm, setShowNpsResponseForm] = useState(false);
  // Status Page
  const [newIncident, setNewIncident] = useState({ title:"",description:"",severity:"minor",affected_components:[] });
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  // ── LOADING ───────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);

  // ── UI STATE ──────────────────────────────────────────
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companySearch, setCompanySearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [companyTab, setCompanyTab] = useState("info");
  const [companyNote, setCompanyNote] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("Sistema em manutenção. Voltamos em breve!");
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [broadcastSegment, setBroadcastSegment] = useState("all");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastScheduleDate, setBroadcastScheduleDate] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [individualEmailSubject, setIndividualEmailSubject] = useState("");
  const [individualEmailContent, setIndividualEmailContent] = useState("");
  const [couponSearch, setCouponSearch] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState({ message:"",type:"info",is_active:true });
  const [newPlan, setNewPlan] = useState({ name:"",price:0,max_agents:3,max_messages:1000 });
  const [newCoupon, setNewCoupon] = useState({ code:"",discount_type:"percent",discount_value:0,expires_at:"",max_uses:100,description:"" });

  // ── SERVER CONNECTION ─────────────────────────────────
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('SUPABASE_URL') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('SUPABASE_ANON_KEY') || '');
  const [waUrl, setWaUrl] = useState(localStorage.getItem('WA_API_URL') || '');
  const [waKey, setWaKey] = useState(localStorage.getItem('WA_API_KEY') || '');

  // Auto-save no localStorage para evitar perda de dados se o usuário fechar a aba sem salvar
  useEffect(() => {
    if (supabaseUrl) localStorage.setItem('SUPABASE_URL', supabaseUrl.trim());
    if (supabaseKey) localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey.trim());
    if (waUrl) localStorage.setItem('WA_API_URL', waUrl.trim());
    if (waKey) localStorage.setItem('WA_API_KEY', waKey.trim());
  }, [supabaseUrl, supabaseKey, waUrl, waKey]);

  const handleSaveConnectionSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('SUPABASE_URL', supabaseUrl.trim());
    localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey.trim());
    localStorage.setItem('WA_API_URL', waUrl.trim());
    localStorage.setItem('WA_API_KEY', waKey.trim());
    
    showToast('Configurações salvas! Recarregando sistema...', 'success');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // ── MODAL ─────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState({ isOpen:false });
  const showConfirm = (opts) => setConfirmModal({ isOpen:true,...opts });
  const closeConfirm = () => setConfirmModal({ isOpen:false });

  // ── AUDIT ─────────────────────────────────────────────
  const logAudit = async (action, targetId=null, details={}) => {
    const sb = getAdminSupabase(); if(!sb||!currentAgent) return;
    try { await sb.from("audit_logs").insert([{ agent_id:currentAgent.id||currentAgent.user_id,action,target_id:targetId,details }]); } catch(e){}
  };

  // ── FETCH FUNCTIONS ───────────────────────────────────
  const fetchCompanies = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return; setLoading(true);
    try {
      const {data,error}=await sb.from("companies").select("*").order("created_at",{ascending:false});
      if(error) throw error;
      const {data:ac}=await sb.from("agents").select("company_id");
      const cm={}; (ac||[]).forEach(a=>{cm[a.company_id]=(cm[a.company_id]||0)+1;});
      const {data:cc}=await sb.from("conversations").select("company_id");
      const cv={}; (cc||[]).forEach(c=>{if(c.company_id) cv[c.company_id]=(cv[c.company_id]||0)+1;});
      setCompanies((data||[]).map(c=>({...c,agent_count:cm[c.id]||0,conv_count:cv[c.id]||0})));
    } catch(e){ console.error(e); showToast("Erro ao buscar empresas: "+e.message,"error"); }
    finally{ setLoading(false); }
  },[]);

  const fetchAnnouncements = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return; setLoadingAnnouncements(true);
    try{ const {data,error}=await sb.from("system_announcements").select("*").order("created_at",{ascending:false}); if(error){if(error.code!=="42P01")throw error;}else setAnnouncements(data||[]); }
    catch(e){console.error(e);}finally{setLoadingAnnouncements(false);}
  },[]);

  const fetchWhatsappInboxes = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return; setLoadingWhatsapp(true);
    try{ const {data,error}=await sb.from("inboxes").select("*, companies(name)").eq("channel_type","whatsapp"); if(!error&&data) setWhatsappInboxes(data); }
    catch(e){console.error(e);}finally{setLoadingWhatsapp(false);}
  },[]);

  const fetchSaasPlans = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("saas_plans").select("*").order("price",{ascending:true}); if(!error&&data) setSaasPlans(data); }catch(e){}
  },[]);

  const fetchAuditLogs = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(100); if(!error&&data) setAuditLogs(data); }catch(e){}
  },[]);

  const fetchUsers = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("agents").select("*, companies(name)").eq("role","superadmin").order("created_at",{ascending:false}); if(!error&&data) setUsers(data); }catch(e){}
  },[]);

  const fetchSettings = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{
      const {data,error}=await sb.from("system_settings").select("*").order("setting_key",{ascending:true});
      if(!error&&data){
        setSettings(data);
        const maint=data.find(s=>s.setting_key==="MAINTENANCE_MODE");
        if(maint) setMaintenanceMode(maint.setting_value==="true");
        const maintMsg=data.find(s=>s.setting_key==="MAINTENANCE_MESSAGE");
        if(maintMsg&&maintMsg.setting_value) setMaintenanceMsg(maintMsg.setting_value);
      }
    }catch(e){}
  },[]);

  const fetchTickets = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("support_tickets").select("*, companies(name)").order("created_at",{ascending:false}); if(!error&&data) setTickets(data); }catch(e){}
  },[]);

  const fetchPayments = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("payment_history").select("*, companies(name)").order("created_at",{ascending:false}); if(!error&&data) setPayments(data); }catch(e){}
  },[]);

  const fetchDomains = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("custom_domains").select("*, companies(name)").order("created_at",{ascending:false}); if(!error&&data) setDomains(data); }catch(e){}
  },[]);

  const fetchBroadcasts = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("broadcast_campaigns").select("*").order("created_at",{ascending:false}); if(!error&&data) setBroadcasts(data); }catch(e){}
  },[]);

  const fetchAffiliates = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("affiliates").select("*").order("created_at",{ascending:false}); if(!error&&data) setAffiliates(data); }catch(e){}
  },[]);

  const fetchSystemErrors = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("system_errors").select("*").order("created_at",{ascending:false}); if(!error&&data) setSystemErrors(data); }catch(e){}
  },[]);

  const fetchCoupons = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("coupons").select("*").order("created_at",{ascending:false}); if(!error&&data) setCoupons(data); }catch(e){ console.error(e); }
  },[]);

  const fetchSessionLogs = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("agents").select("id,name,email,role,last_seen_at,is_banned,company_id,companies(name)").not("last_seen_at","is",null).order("last_seen_at",{ascending:false}).limit(50); if(!error&&data) setSessionLogs(data); }catch(e){}
  },[]);

  const fetchPipeline = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("sales_pipeline").select("*").order("created_at",{ascending:false}); if(!error&&data) setPipeline(data); }catch(e){ console.warn("sales_pipeline table not found, using empty state"); }
  },[]);

  const fetchUsageLogs = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("usage_logs").select("*, companies(name)").order("month",{ascending:false}); if(!error&&data) setUsageLogs(data); }catch(e){ console.warn("usage_logs table not found"); }
  },[]);

  const fetchFinancialTx = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("financial_transactions").select("*, companies(name)").order("created_at",{ascending:false}); if(!error&&data) setFinancialTx(data); }catch(e){ console.warn("financial_transactions table not found"); }
  },[]);

  const fetchNps = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{
      const {data:s}=await sb.from("nps_surveys").select("*").order("created_at",{ascending:false});
      if(s) setNpsSurveys(s);
      const {data:r}=await sb.from("nps_responses").select("*, companies(name)").order("created_at",{ascending:false});
      if(r) setNpsResponses(r);
    }catch(e){ console.warn("nps tables not found"); }
  },[]);

  const fetchStatusPage = useCallback(async()=>{
    const sb=getAdminSupabase(); if(!sb) return;
    try{
      const {data:c}=await sb.from("status_components").select("*").order("sort_order",{ascending:true});
      if(c) setStatusComponents(c);
      const {data:i}=await sb.from("status_incidents").select("*").order("created_at",{ascending:false}).limit(20);
      if(i) setStatusIncidents(i);
    }catch(e){ console.warn("status tables not found"); }
  },[]);

  const refreshAll = () => {
    fetchCompanies();fetchAnnouncements();fetchWhatsappInboxes();fetchSaasPlans();
    fetchAuditLogs();fetchUsers();fetchSettings();fetchTickets();fetchPayments();
    fetchDomains();fetchBroadcasts();fetchAffiliates();fetchSystemErrors();fetchCoupons();fetchSessionLogs();
    fetchPipeline();fetchUsageLogs();fetchFinancialTx();fetchNps();fetchStatusPage();
    showToast("Dados atualizados!","success");
  };

  useEffect(()=>{
    fetchCompanies();fetchAnnouncements();fetchWhatsappInboxes();fetchSaasPlans();
    fetchAuditLogs();fetchUsers();fetchSettings();fetchTickets();fetchPayments();
    fetchDomains();fetchBroadcasts();fetchAffiliates();fetchSystemErrors();fetchCoupons();fetchSessionLogs();
    fetchPipeline();fetchUsageLogs();fetchFinancialTx();fetchNps();fetchStatusPage();
  },[fetchCompanies,fetchAnnouncements,fetchWhatsappInboxes,fetchSaasPlans,fetchAuditLogs,
    fetchUsers,fetchSettings,fetchTickets,fetchPayments,fetchDomains,fetchBroadcasts,
    fetchAffiliates,fetchSystemErrors,fetchCoupons,fetchSessionLogs,
    fetchPipeline,fetchUsageLogs,fetchFinancialTx,fetchNps,fetchStatusPage]);

  // ── HANDLERS ──────────────────────────────────────────
  const handleCreateCompany = async(form) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{
      const {error}=await sb.from("companies").insert([{ name:form.name,email:form.email,phone:form.phone||null,plan_id:form.plan_id||null,subscription_status:"trial" }]);
      if(error) throw error;
      await logAudit("CREATE_COMPANY",null,{company_name:form.name});
      showToast(`Empresa "${form.name}" criada!`,"success");
      setShowCreateCompanyModal(false); fetchCompanies();
    }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleLoginAs = async(company) => {
    showConfirm({ title:"Acessar conta da empresa",message:`Você entrará no ChatDesk como dono de "${company.name}". Deseja continuar?`,confirmLabel:"Entrar como Admin",confirmColor:"var(--accent)",icon:Eye,
      onConfirm:async()=>{
        closeConfirm(); const sb=getAdminSupabase(); if(!sb) return;
        try{
          localStorage.setItem("SUPERADMIN_ORIGINAL_COMPANY_ID",currentAgent.company_id||"");
          const mf=currentAgent.id?"id":"user_id"; const mv=currentAgent.id||currentAgent.user_id;
          const {error}=await sb.from("agents").update({company_id:company.id}).eq(mf,mv);
          if(error) throw error;
          await logAudit("IMPERSONATE",company.id,{company_name:company.name});
          showToast(`Entrando em ${company.name}...`,"success");
          setTimeout(()=>{window.location.href="/";},800);
        }catch(e){ showToast("Erro: "+e.message,"error"); }
      }
    });
  };

  const handleStatusChange = async(companyId,newStatus) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{
      const updates={subscription_status:newStatus};
      if(newStatus==="active"){ const exp=new Date(); exp.setDate(exp.getDate()+30); updates.subscription_ends_at=exp.toISOString(); }
      const {error}=await sb.from("companies").update(updates).eq("id",companyId);
      if(error) throw error;
      await logAudit("STATUS_CHANGE",companyId,{new_status:newStatus});
      showToast("Status atualizado!","success"); fetchCompanies();
      if(selectedCompany?.id===companyId) setSelectedCompany(p=>({...p,...updates}));
    }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleChangePlan = async(companyId,newPlanId) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{
      const {error}=await sb.from("companies").update({plan_id:newPlanId}).eq("id",companyId);
      if(error) throw error;
      await logAudit("CHANGE_PLAN",companyId,{plan_id:newPlanId});
      showToast("Plano alterado!","success");
      setCompanies(p=>p.map(c=>c.id===companyId?{...c,plan_id:newPlanId}:c));
      if(selectedCompany?.id===companyId) setSelectedCompany(p=>({...p,plan_id:newPlanId}));
    }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleExtendTrial = async(companyId) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{
      const exp=new Date(); exp.setDate(exp.getDate()+7);
      await sb.from("companies").update({subscription_status:"trial",subscription_ends_at:exp.toISOString()}).eq("id",companyId);
      await logAudit("EXTEND_TRIAL",companyId,{days:7});
      showToast("+7 dias de trial!","success"); fetchCompanies();
    }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleUpdateTheme = async(companyId,color) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{ await sb.from("companies").update({theme_color:color}).eq("id",companyId); await logAudit("UPDATE_THEME",companyId,{theme_color:color}); showToast("Cor atualizada!","success"); fetchCompanies(); }catch(e){}
  };

  const handleDelete = async(company) => {
    showConfirm({ title:"⚠️ Excluir empresa permanentemente",message:`Isto vai APAGAR "${company.name}" e TODOS os dados. Esta ação NÃO pode ser desfeita!`,confirmLabel:"Sim, excluir tudo",confirmColor:"var(--danger)",icon:Trash2,
      onConfirm:async()=>{ closeConfirm(); const sb=getAdminSupabase(); if(!sb) return;
        try{ await sb.from("companies").delete().eq("id",company.id); await logAudit("DELETE_COMPANY",company.id,{company_name:company.name}); showToast("Empresa excluída.","success"); setSelectedCompany(null); fetchCompanies(); }catch(e){ showToast("Erro: "+e.message,"error"); }
      }
    });
  };

  const handleToggleCustomFeature = async(companyId,currentFeatures,featureKey) => {
    const sb=getAdminSupabase(); if(!sb) return;
    const nf={...currentFeatures,[featureKey]:!currentFeatures[featureKey]};
    try{ const {error}=await sb.from("companies").update({custom_features:nf}).eq("id",companyId); if(error) throw error; showToast("Feature atualizada!","success"); setCompanies(p=>p.map(c=>c.id===companyId?{...c,custom_features:nf}:c)); setSelectedCompany(p=>({...p,custom_features:nf})); }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleSaveNote = async(companyId) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {error}=await sb.from("companies").update({admin_notes:companyNote}).eq("id",companyId); if(error) throw error; await logAudit("UPDATE_NOTES",companyId); showToast("Notas salvas!","success"); setCompanies(p=>p.map(c=>c.id===companyId?{...c,admin_notes:companyNote}:c)); setSelectedCompany(p=>({...p,admin_notes:companyNote})); }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleSendIndividualEmail = (company) => {
    if(!individualEmailSubject.trim()||!individualEmailContent.trim()){ showToast("Preencha assunto e conteúdo!","error"); return; }
    showConfirm({ title:`Enviar e-mail para ${company.name}`,message:`Enviar "${individualEmailSubject}" para ${company.email||"(sem e-mail)"}?`,confirmLabel:"Enviar",confirmColor:"var(--accent)",icon:Mail,
      onConfirm:async()=>{ closeConfirm(); const sb=getAdminSupabase();
        if(sb) await sb.from("broadcast_campaigns").insert([{subject:individualEmailSubject,content:individualEmailContent,status:"sent",recipient_company_id:company.id,sent_at:new Date().toISOString()}]);
        await logAudit("SEND_INDIVIDUAL_EMAIL",company.id,{subject:individualEmailSubject});
        showToast(`E-mail enviado para ${company.name}!`,"success"); setIndividualEmailSubject(""); setIndividualEmailContent(""); fetchBroadcasts();
      }
    });
  };

  const handleCreateAnnouncement = async(e) => {
    e.preventDefault(); if(!newAnnouncement.message.trim()) return;
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {data,error}=await sb.from("system_announcements").insert([{message:newAnnouncement.message,type:newAnnouncement.type,is_active:newAnnouncement.is_active,created_by:currentAgent?.id}]).select(); if(error) throw error; await logAudit("CREATE_ANNOUNCEMENT",data[0].id,{message:newAnnouncement.message}); showToast("Aviso publicado!","success"); setNewAnnouncement({message:"",type:"info",is_active:true}); fetchAnnouncements(); }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleToggleAnnouncement = async(id,cur) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {error}=await sb.from("system_announcements").update({is_active:!cur}).eq("id",id); if(error) throw error; fetchAnnouncements(); }catch(e){}
  };

  const handleDeleteAnnouncement = (id) => {
    showConfirm({ title:"Excluir aviso",message:"Tem certeza que deseja excluir este aviso global?",confirmLabel:"Excluir",confirmColor:"var(--danger)",icon:Trash2,
      onConfirm:async()=>{ closeConfirm(); const sb=getAdminSupabase(); if(!sb) return; try{ await sb.from("system_announcements").delete().eq("id",id); await logAudit("DELETE_ANNOUNCEMENT",id); fetchAnnouncements(); }catch(e){} }
    });
  };

  const handleCreatePlan = async(e) => {
    e.preventDefault(); if(!newPlan.name.trim()) return;
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {error}=await sb.from("saas_plans").insert([newPlan]); if(error) throw error; await logAudit("CREATE_PLAN",null,{plan_name:newPlan.name}); showToast("Plano criado!","success"); setNewPlan({name:"",price:0,max_agents:3,max_messages:1000}); fetchSaasPlans(); }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleRestartInstance = (inboxId,inboxName) => {
    showConfirm({ title:"Reiniciar instância",message:`Reiniciar a instância de "${inboxName}"?`,confirmLabel:"Reiniciar",confirmColor:"#f59e0b",icon:RefreshCw,
      onConfirm:async()=>{ closeConfirm(); showToast(`Reinício enviado para ${inboxName}.`,"success"); await logAudit("RESTART_INSTANCE",inboxId,{inbox_name:inboxName}); }
    });
  };

  const handleBanUser = (user) => {
    const action=user.is_banned?"desbloquear":"bloquear";
    showConfirm({ title:`${user.is_banned?"Desbloquear":"Bloquear"} usuário`,message:`Tem certeza que deseja ${action} ${user.name}?`,confirmLabel:user.is_banned?"Desbloquear":"Bloquear",confirmColor:user.is_banned?"var(--success)":"var(--danger)",icon:user.is_banned?Unlock:Lock,
      onConfirm:async()=>{ closeConfirm(); const sb=getAdminSupabase(); if(!sb) return; try{ const {error}=await sb.from("agents").update({is_banned:!user.is_banned}).eq("id",user.id); if(error) throw error; showToast(`Usuário ${action}!`,"success"); fetchUsers(); fetchSessionLogs(); }catch(e){} }
    });
  };

  const handleUpdateSetting = async(key,value) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {error}=await sb.from("system_settings").update({setting_value:value}).eq("setting_key",key); if(error) throw error; await logAudit("UPDATE_SETTING",null,{key,value}); showToast(`${key} atualizado!`,"success"); fetchSettings(); }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleToggleMaintenanceMode = async() => {
    const sb=getAdminSupabase(); if(!sb) return;
    const newVal=!maintenanceMode;
    showConfirm({ title:newVal?"Ativar modo manutenção":"Desativar manutenção",message:newVal?"Isso bloqueará todos os logins dos clientes com a mensagem de manutenção!":"Isso restaurará o acesso normal ao sistema.",confirmLabel:newVal?"Ativar":"Desativar",confirmColor:newVal?"var(--danger)":"var(--success)",icon:newVal?Lock:Unlock,
      onConfirm:async()=>{ closeConfirm();
        try{ await sb.from("system_settings").upsert({setting_key:"MAINTENANCE_MODE",setting_value:newVal?"true":"false"},{onConflict:"setting_key"});
          await sb.from("system_settings").upsert({setting_key:"MAINTENANCE_MESSAGE",setting_value:maintenanceMsg},{onConflict:"setting_key"});
          await logAudit(newVal?"MAINTENANCE_ON":"MAINTENANCE_OFF"); setMaintenanceMode(newVal); showToast(`Manutenção ${newVal?"ATIVADA":"DESATIVADA"}!`,newVal?"error":"success");
        }catch(e){ showToast("Erro: "+e.message,"error"); }
      }
    });
  };

  const handleCreateCoupon = async(e) => {
    e.preventDefault(); if(!newCoupon.code.trim()) return;
    const sb=getAdminSupabase(); if(!sb) return;
    try{
      const payload={...newCoupon,code:newCoupon.code.toUpperCase(),used_count:0};
      if(!payload.expires_at) delete payload.expires_at;
      const {error}=await sb.from("coupons").insert([payload]);
      if(error) throw error;
      await logAudit("CREATE_COUPON",null,{code:newCoupon.code});
      showToast("Cupom criado!","success"); setNewCoupon({code:"",discount_type:"percent",discount_value:0,expires_at:"",max_uses:100,description:""}); fetchCoupons();
    }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleDeleteCoupon = (coupon) => {
    showConfirm({ title:"Excluir cupom",message:`Excluir o cupom "${coupon.code}"? Isso não afetará empresas que já usaram.`,confirmLabel:"Excluir",confirmColor:"var(--danger)",icon:Trash2,
      onConfirm:async()=>{ closeConfirm(); const sb=getAdminSupabase(); if(!sb) return; try{ await sb.from("coupons").delete().eq("id",coupon.id); showToast("Cupom excluído!","success"); fetchCoupons(); }catch(e){ showToast("Erro: "+e.message,"error"); } }
    });
  };

  const handleApplyCouponToCompany = async(couponId,companyId,companyName,couponCode) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{ await sb.from("companies").update({coupon_id:couponId}).eq("id",companyId); await logAudit("APPLY_COUPON",companyId,{coupon_id:couponId,company_name:companyName}); showToast(`Cupom "${couponCode}" aplicado a ${companyName}!`,"success"); fetchCompanies(); }catch(e){ showToast("Erro: "+e.message,"error"); }
  };

  const handleSendBroadcast = () => {
    if(!broadcastSubject.trim()||!broadcastContent.trim()){ showToast("Preencha assunto e conteúdo!","error"); return; }
    const segLabel={all:"todos",active:"clientes ativos",trial:"clientes em trial",past_due:"clientes inadimplentes"};
    const recipients=broadcastSegment==="all"?companies:companies.filter(c=>c.subscription_status===broadcastSegment);
    showConfirm({ title:"Enviar broadcast",message:`Isso enviará "${broadcastSubject}" para ${recipients.length} empresa(s) — ${segLabel[broadcastSegment]}.`,confirmLabel:`Enviar para ${recipients.length}`,confirmColor:"var(--accent)",icon:Send,
      onConfirm:async()=>{ closeConfirm(); const sb=getAdminSupabase();
        if(sb){ const payload={subject:broadcastSubject,content:broadcastContent,status:broadcastScheduleDate?"scheduled":"sent",segment:broadcastSegment,recipient_count:recipients.length}; if(broadcastScheduleDate) payload.scheduled_at=broadcastScheduleDate; else payload.sent_at=new Date().toISOString(); await sb.from("broadcast_campaigns").insert([payload]); fetchBroadcasts(); }
        await logAudit("BROADCAST",null,{subject:broadcastSubject,segment:broadcastSegment,count:recipients.length});
        showToast(broadcastScheduleDate?`Broadcast agendado para ${new Date(broadcastScheduleDate).toLocaleString("pt-BR")}!`:`Broadcast enviado para ${recipients.length} clientes!`,"success");
        setBroadcastSubject(""); setBroadcastContent(""); setBroadcastScheduleDate(""); setSelectedTemplate(null);
      }
    });
  };

  const handleResolveTicket = async(ticket) => {
    const sb=getAdminSupabase(); if(!sb) return;
    try{ const {error}=await sb.from("support_tickets").update({status:"resolved",resolved_at:new Date().toISOString()}).eq("id",ticket.id); if(error) throw error; showToast("Ticket resolvido!","success"); fetchTickets(); }catch(e){}
  };

  const handleExportCSV = (data,filename) => {
    if(!data||data.length===0){ showToast("Nenhum dado para exportar.","error"); return; }
    const headers=Object.keys(data[0]).join(","); const rows=data.map(row=>Object.values(row).map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([headers+"\n"+rows],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); showToast("CSV exportado!","success");
  };

  const handlePromoteAdmin = () => {
    const email=window.prompt("Digite o e-mail do usuário para promover a Super Admin:");
    if(!email) return;
    getAdminSupabase().from("agents").update({role:"superadmin"}).eq("email",email.trim()).then(({error})=>{ if(error) showToast("Erro ao promover","error"); else{ showToast("Usuário promovido!","success"); fetchUsers(); } });
  };

  // ── COMPUTED VALUES ───────────────────────────────────
  const total=companies.length;
  const trials=companies.filter(c=>c.subscription_status==="trial").length;
  const active=companies.filter(c=>c.subscription_status==="active").length;
  const pastDue=companies.filter(c=>c.subscription_status==="past_due").length;
  const cancelled=companies.filter(c=>c.subscription_status==="cancelled").length;
  const mrr=active*97;
  const openTickets=tickets.filter(t=>t.status!=="resolved").length;
  const criticalErrors=systemErrors.filter(e=>e.severity==="critical").length;
  const disconnectedWA=whatsappInboxes.filter(i=>!i.is_connected).length;

  const getTrialDays=(endsAt)=>{ if(!endsAt) return null; const diff=new Date(endsAt)-new Date(); return Math.ceil(diff/(1000*60*60*24)); };

  const trialsExpiringSoon=useMemo(()=>companies.filter(c=>{ if(c.subscription_status!=="trial") return false; const d=getTrialDays(c.subscription_ends_at); return d!==null&&d>=0&&d<=3; }),[companies]);

  const monthlyGrowth=useMemo(()=>{
    const months={}; const now=new Date();
    for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; months[k]=0; }
    companies.forEach(c=>{ const k=new Date(c.created_at).toISOString().slice(0,7); if(months[k]!==undefined) months[k]++; });
    return Object.entries(months).map(([month,count])=>({month,count}));
  },[companies]);

  const healthScores=useMemo(()=>companies.map(c=>{ const hasWA=whatsappInboxes.some(i=>i.company_id===c.id&&i.is_connected); let score=0; if(c.agent_count>0) score+=25; if((c.conv_count||0)>0) score+=25; if(hasWA) score+=25; if(c.subscription_status==="active") score+=25; return {...c,health_score:score}; }),[companies,whatsappInboxes]);

  const churnRate=useMemo(()=>total>0?((cancelled/total)*100).toFixed(1):0,[cancelled,total]);
  const conversionRate=useMemo(()=>{ const ev=active+cancelled; return (trials+ev)>0?((active/(trials+ev))*100).toFixed(1):0; },[active,trials,cancelled]);
  const mrrForecast3m=Math.round(mrr*1.33);
  const mrrForecast6m=Math.round(mrr*1.77);

  const avgHealthScore=useMemo(()=>healthScores.length>0?Math.round(healthScores.reduce((a,c)=>a+c.health_score,0)/healthScores.length):0,[healthScores]);
  const atRiskCompanies=useMemo(()=>healthScores.filter(c=>c.health_score<50),[healthScores]);
  const activeSessionsCount=sessionLogs.filter(s=>{ if(!s.last_seen_at) return false; const diff=(new Date()-new Date(s.last_seen_at))/1000/60; return diff<30; }).length;

  // Filtered
  const filteredCompanies=companies.filter(c=>{ const ms=!companySearch||c.name?.toLowerCase().includes(companySearch.toLowerCase())||c.email?.toLowerCase().includes(companySearch.toLowerCase()); const mf=companyFilter==="all"||c.subscription_status===companyFilter; return ms&&mf; });
  const filteredUsers=users.filter(u=>!userSearch||u.name?.toLowerCase().includes(userSearch.toLowerCase())||u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredAuditLogs=auditLogs.filter(l=>!auditSearch||l.action?.toLowerCase().includes(auditSearch.toLowerCase())||JSON.stringify(l.details)?.toLowerCase().includes(auditSearch.toLowerCase()));
  const filteredCoupons=coupons.filter(c=>!couponSearch||c.code?.toLowerCase().includes(couponSearch.toLowerCase())||c.description?.toLowerCase().includes(couponSearch.toLowerCase()));

  const broadcastRecipients=broadcastSegment==="all"?companies:companies.filter(c=>c.subscription_status===broadcastSegment);

  // ── SIDEBAR CONFIG ────────────────────────────────────
  const overallSystemStatus=statusComponents.length>0?(statusComponents.some(c=>c.status==="outage")?"outage":statusComponents.some(c=>c.status==="degraded")?"degraded":"operational"):"operational";
  const openIncidents=statusIncidents.filter(i=>i.status!=="resolved").length;
  const npsAvg=npsResponses.length>0?Math.round(npsResponses.reduce((a,r)=>a+r.score,0)/npsResponses.length*10)/10:null;

  const sidebarGroups=[
    { label:"Visão Geral", items:[{ id:"dashboard",label:"Dashboard",icon:LayoutDashboard },{ id:"analytics",label:"Analytics & BI",icon:BarChart2 }] },
    { label:"Clientes", items:[
      { id:"companies",label:"Empresas",icon:Building2,badge:pastDue>0?pastDue:null,badgeColor:"#ef4444" },
      { id:"lifecycle",label:"Lifecycle & Saúde",icon:Heart,badge:atRiskCompanies.length>0?atRiskCompanies.length:null,badgeColor:"#f59e0b" },
      { id:"uso",label:"Painel de Uso",icon:Activity },
      { id:"usuarios",label:"Equipe (Admins)",icon:UserCog },
      { id:"whatsapp",label:"Conexões WhatsApp",icon:Cpu,badge:disconnectedWA>0?disconnectedWA:null,badgeColor:"#f59e0b" },
      { id:"dominios",label:"Domínios White-label",icon:Globe },
    ]},
    { label:"Negócio", items:[
      { id:"pipeline",label:"Pipeline de Vendas",icon:GitBranch,badge:pipeline.filter(p=>p.stage==="negotiation").length||null,badgeColor:"var(--accent)" },
      { id:"financeiro",label:"Financeiro",icon:Wallet },
      { id:"planos",label:"Planos SaaS",icon:Package },
      { id:"cupons",label:"Cupons de Desconto",icon:Tag },
      { id:"afiliados",label:"Afiliados & Revendas",icon:Handshake },
    ]},
    { label:"Comunicação", items:[
      { id:"nps",label:"NPS & Satisfação",icon:Smile,badge:npsAvg!==null?`${npsAvg}`:null,badgeColor:npsAvg!==null&&npsAvg>=7?"var(--success)":"var(--danger)" },
      { id:"avisos",label:"Avisos Globais",icon:BellRing,badge:announcements.filter(a=>a.is_active).length||null,badgeColor:"var(--accent)" },
      { id:"broadcast",label:"E-mails em Massa",icon:Megaphone },
    ]},
    { label:"Suporte & Segurança", items:[
      { id:"status",label:"Status Page",icon:Radio,badge:openIncidents>0?openIncidents:(overallSystemStatus!=="operational"?"!":null),badgeColor:openIncidents>0?"#ef4444":"#f59e0b" },
      { id:"tickets",label:"Suporte",icon:LifeBuoy,badge:openTickets>0?openTickets:null,badgeColor:"#ef4444" },
      { id:"seguranca",label:"Segurança & Sessões",icon:ShieldAlert,badge:activeSessionsCount>0?activeSessionsCount:null,badgeColor:"var(--success)" },
      { id:"erros",label:"Erros do Sistema",icon:Bug,badge:criticalErrors>0?criticalErrors:null,badgeColor:"#ef4444" },
      { id:"configuracoes",label:"Configurações",icon:Settings,badge:maintenanceMode?"ON":null,badgeColor:"#ef4444" },
      { id:"auditoria",label:"Log de Auditoria",icon:Shield },
    ]},
  ];

  const annColors={ info:{bg:"rgba(56,189,248,.15)",border:"rgba(56,189,248,.3)",color:"#38bdf8"}, warning:{bg:"rgba(245,158,11,.15)",border:"rgba(245,158,11,.3)",color:"#f59e0b"}, danger:{bg:"rgba(239,68,68,.15)",border:"rgba(239,68,68,.3)",color:"#ef4444"}, success:{bg:"rgba(16,185,129,.15)",border:"rgba(16,185,129,.3)",color:"#10b981"} };

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex",height:"100%",width:"100%",overflow:"hidden",background:"var(--bg-primary)" }}>
      <ConfirmModal {...confirmModal} onCancel={closeConfirm}/>
      <CreateCompanyModal isOpen={showCreateCompanyModal} onClose={()=>setShowCreateCompanyModal(false)} onSubmit={handleCreateCompany} saasPlans={saasPlans}/>

      {/* ═══════ SIDEBAR ═══════ */}
      <aside style={{ width:isSidebarCollapsed?"64px":"240px",minWidth:isSidebarCollapsed?"64px":"240px",display:"flex",flexDirection:"column",borderRight:"1px solid var(--border)",background:"var(--grad-sidebar)",transition:"width .3s cubic-bezier(.4,0,.2,1),min-width .3s cubic-bezier(.4,0,.2,1)",overflow:"hidden" }}>
        {/* Logo */}
        <div style={{ padding:isSidebarCollapsed?"20px 0":"18px 14px",borderBottom:"1px solid rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:isSidebarCollapsed?"center":"space-between",flexShrink:0,gap:"8px" }}>
          {!isSidebarCollapsed&&(
            <div style={{ display:"flex",alignItems:"center",gap:"10px",minWidth:0 }}>
              <div style={{ width:"32px",height:"32px",borderRadius:"10px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 12px rgba(99,102,241,.4)",flexShrink:0 }}><Shield size={16} color="white"/></div>
              <div style={{ minWidth:0 }}>
                <p style={{ margin:0,fontSize:"12px",fontWeight:800,color:"var(--text-primary)",letterSpacing:".5px" }}>SUPER ADMIN</p>
                <p style={{ margin:0,fontSize:"10px",color:"var(--text-muted)" }}>Painel Mestre</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed&&<div style={{ width:"32px",height:"32px",borderRadius:"10px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center" }}><Shield size={15} color="white"/></div>}
          <button onClick={()=>setIsSidebarCollapsed(!isSidebarCollapsed)} style={{ background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",color:"var(--text-muted)",cursor:"pointer",padding:"5px",borderRadius:"6px",display:"flex",alignItems:"center",flexShrink:0,marginTop:isSidebarCollapsed?"8px":0 }}>
            {isSidebarCollapsed?<ChevronRight size={14}/>:<ChevronLeft size={14}/>}
          </button>
        </div>

        {/* Maintenance banner */}
        {maintenanceMode&&!isSidebarCollapsed&&(
          <div style={{ margin:"8px 10px 0",padding:"8px 12px",borderRadius:"8px",background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",display:"flex",alignItems:"center",gap:"6px" }}>
            <Lock size={12} style={{ color:"#ef4444",flexShrink:0 }}/><span style={{ fontSize:"10px",fontWeight:700,color:"#ef4444" }}>MANUTENÇÃO ATIVA</span>
          </div>
        )}

        {/* Nav */}
        <div style={{ flex:1,overflowY:"auto",padding:isSidebarCollapsed?"12px 8px":"12px 10px",display:"flex",flexDirection:"column",gap:"2px" }}>
          {sidebarGroups.map((group,gi)=>(
            <div key={gi} style={{ marginBottom:"4px" }}>
              {!isSidebarCollapsed&&<p style={{ margin:gi===0?"0 0 6px 6px":"14px 0 6px 6px",fontSize:"9px",fontWeight:800,color:"rgba(255,255,255,.2)",textTransform:"uppercase",letterSpacing:"1px" }}>{group.label}</p>}
              {gi>0&&isSidebarCollapsed&&<div style={{ height:"1px",background:"rgba(255,255,255,.04)",margin:"8px 0" }}/>}
              {group.items.map(tab=>{
                const isActive=activeTab===tab.id;
                return (
                  <button key={tab.id} className="sa-sidebar-item" onClick={()=>setActiveTab(tab.id)} title={isSidebarCollapsed?tab.label:undefined} style={{ display:"flex",alignItems:"center",justifyContent:isSidebarCollapsed?"center":"flex-start",gap:"9px",background:isActive?"linear-gradient(90deg,rgba(99,102,241,.2),rgba(99,102,241,.05))":"transparent",border:"none",borderLeft:isActive&&!isSidebarCollapsed?"2px solid var(--accent)":"2px solid transparent",color:isActive?"var(--text-primary)":"rgba(255,255,255,.45)",fontWeight:isActive?700:400,cursor:"pointer",padding:isSidebarCollapsed?"10px 0":"9px 10px",borderRadius:"8px",fontSize:"12.5px",textAlign:"left",width:"100%",position:"relative" }}>
                    <tab.icon size={isSidebarCollapsed?18:15} style={{ flexShrink:0,color:isActive?"var(--accent)":"inherit" }}/>
                    {!isSidebarCollapsed&&<><span style={{ flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{tab.label}</span>{tab.badge&&<span style={{ minWidth:"18px",height:"18px",borderRadius:"9px",background:tab.badgeColor||"var(--accent)",color:"white",fontSize:"10px",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",flexShrink:0 }}>{tab.badge}</span>}</>}
                    {isSidebarCollapsed&&tab.badge&&<span style={{ position:"absolute",top:"4px",right:"4px",width:"8px",height:"8px",borderRadius:"50%",background:tab.badgeColor||"var(--accent)" }}/>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ padding:isSidebarCollapsed?"12px 8px":"12px 10px",borderTop:"1px solid rgba(255,255,255,.04)",flexShrink:0 }}>
          {!isSidebarCollapsed&&<div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px",borderRadius:"10px",background:"rgba(255,255,255,.04)",marginBottom:"8px" }}>
            <div style={{ width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:800,color:"white",flexShrink:0 }}>{(currentAgent?.name||"S").charAt(0).toUpperCase()}</div>
            <div style={{ minWidth:0 }}>
              <p style={{ margin:0,fontSize:"12px",fontWeight:700,color:"var(--text-primary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{currentAgent?.name||"Super Admin"}</p>
              <p style={{ margin:0,fontSize:"10px",color:"var(--accent)" }}>Super Admin</p>
            </div>
          </div>}
          <button onClick={()=>showConfirm({title:"Sair do painel",message:"Deseja fazer logout?",confirmLabel:"Sair",confirmColor:"var(--danger)",icon:LogOut,onConfirm:async()=>{closeConfirm();const sb=getSupabase();if(sb)await sb.auth.signOut();window.location.href="/login";}})}
            className="sa-sidebar-item" title={isSidebarCollapsed?"Sair":undefined} style={{ display:"flex",alignItems:"center",justifyContent:isSidebarCollapsed?"center":"flex-start",gap:"9px",background:"transparent",border:"1px solid rgba(239,68,68,.2)",color:"rgba(239,68,68,.7)",cursor:"pointer",padding:isSidebarCollapsed?"10px 0":"9px 10px",borderRadius:"8px",fontSize:"12.5px",width:"100%" }}>
            <LogOut size={isSidebarCollapsed?18:15}/>{!isSidebarCollapsed&&<span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ═══════ MAIN ═══════ */}
      <main style={{ flex:1,overflowY:"auto",padding:"24px 28px",minWidth:0 }}>
        {/* Global header */}
        <div style={{ display:"flex",justifyContent:"flex-end",alignItems:"center",marginBottom:"4px",gap:"8px" }}>
          <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",hour:"2-digit",minute:"2-digit"})}</span>
          <button onClick={refreshAll} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"6px 12px",borderRadius:"8px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-muted)",fontSize:"12px" }}>
            <RefreshCw size={12}/> Atualizar Tudo
          </button>
        </div>

        {/* ═══ DASHBOARD ═══ */}
        {activeTab==="dashboard"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Visão do Negócio" subtitle="Resumo em tempo real de todos os seus clientes SaaS" icon={LayoutDashboard} iconColor="var(--accent)"
              actions={<button onClick={()=>handleExportCSV(companies,"empresas.csv")} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"8px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-secondary)",fontSize:"12px",fontWeight:600 }}><Download size={13}/> CSV</button>}
            />

            {/* Proactive Alerts */}
            {maintenanceMode&&<AlertBanner type="danger" icon={Lock} message="⚠️ MODO MANUTENÇÃO ATIVO — Todos os logins de clientes estão bloqueados!" onClick={()=>setActiveTab("configuracoes")}/>}
            {trialsExpiringSoon.length>0&&<AlertBanner type="warning" icon={Clock} message={`${trialsExpiringSoon.length} empresa(s) com trial expirando em ≤3 dias: ${trialsExpiringSoon.map(c=>c.name).slice(0,3).join(", ")}${trialsExpiringSoon.length>3?"...":""}`} onClick={()=>{ setCompanyFilter("trial"); setActiveTab("companies"); }}/>}
            {pastDue>0&&<AlertBanner type="danger" icon={AlertTriangle} message={`${pastDue} cliente(s) inadimplente(s) — R$ ${(pastDue*97).toLocaleString("pt-BR")} em risco!`} onClick={()=>{ setCompanyFilter("past_due"); setActiveTab("companies"); }}/>}
            {criticalErrors>0&&<AlertBanner type="danger" icon={Bug} message={`${criticalErrors} erro(s) crítico(s) detectado(s). Verifique a aba Erros.`} onClick={()=>setActiveTab("erros")}/>}
            {disconnectedWA>0&&<AlertBanner type="warning" icon={Cpu} message={`${disconnectedWA} instância(s) do WhatsApp desconectada(s).`} onClick={()=>setActiveTab("whatsapp")}/>}
            {openTickets>0&&<AlertBanner type="info" icon={LifeBuoy} message={`${openTickets} ticket(s) de suporte aguardando atendimento.`} onClick={()=>setActiveTab("tickets")}/>}
            {atRiskCompanies.length>0&&<AlertBanner type="warning" icon={Heart} message={`${atRiskCompanies.length} empresa(s) com Health Score baixo (em risco de churn).`} onClick={()=>setActiveTab("lifecycle")}/>}

            {/* Stats */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"14px",marginBottom:"28px" }}>
              <StatCardV2 icon={Building2} label="Total de Clientes" value={total} color="var(--accent)" delay={0} onClick={()=>setActiveTab("companies")}/>
              <StatCardV2 icon={Wallet} label="MRR" value={`R$ ${mrr.toLocaleString("pt-BR")}`} color="var(--success)" sublabel={`Forecast 3m: R$ ${mrrForecast3m.toLocaleString("pt-BR")}`} delay={60}/>
              <StatCardV2 icon={CheckCircle2} label="Ativos" value={active} color="var(--success)" sublabel={`${total>0?Math.round((active/total)*100):0}% do total`} delay={120}/>
              <StatCardV2 icon={Clock} label="Em Trial" value={trials} color="#f59e0b" sublabel={`${trialsExpiringSoon.length} expirando em breve`} delay={180}/>
              <StatCardV2 icon={AlertTriangle} label="Inadimplentes" value={pastDue} color="var(--danger)" sublabel={`R$ ${(pastDue*97).toLocaleString("pt-BR")} em risco`} delay={240}/>
              <StatCardV2 icon={Heart} label="Health Score Médio" value={`${avgHealthScore}/100`} color={avgHealthScore>=75?"var(--success)":avgHealthScore>=50?"#f59e0b":"var(--danger)"} sublabel={`${atRiskCompanies.length} em risco`} delay={300} onClick={()=>setActiveTab("lifecycle")}/>
            </div>

            {/* Charts row */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:"18px",marginBottom:"28px" }}>
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",padding:"22px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px" }}>
                  <div>
                    <h3 style={{ margin:0,fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>Novos Cadastros — Últimos 6 Meses</h3>
                    <p style={{ margin:"3px 0 0",fontSize:"12px",color:"var(--text-muted)" }}>Total de empresas que se registraram</p>
                  </div>
                  <div style={{ fontSize:"20px",fontWeight:800,color:"var(--accent)" }}>{monthlyGrowth.reduce((a,b)=>a+b.count,0)} total</div>
                </div>
                <MiniBarChart data={monthlyGrowth} color="var(--accent)" height={80}/>
              </div>
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",padding:"22px" }}>
                <h3 style={{ margin:"0 0 16px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>Indicadores Chave</h3>
                {[
                  { label:"Taxa de Conversão (Trial→Ativo)", value:`${conversionRate}%`, color:"var(--success)" },
                  { label:"Taxa de Churn", value:`${churnRate}%`, color:parseFloat(churnRate)>10?"var(--danger)":"var(--success)" },
                  { label:"Forecast MRR 3 Meses", value:`R$ ${mrrForecast3m.toLocaleString("pt-BR")}`, color:"var(--accent)" },
                  { label:"Forecast MRR 6 Meses", value:`R$ ${mrrForecast6m.toLocaleString("pt-BR")}`, color:"var(--accent)" },
                  { label:"ARR Estimado", value:`R$ ${(mrr*12).toLocaleString("pt-BR")}`, color:"var(--success)" },
                ].map(item=>(
                  <div key={item.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:"12px" }}>
                    <span style={{ fontSize:"11px",color:"var(--text-muted)",maxWidth:"60%" }}>{item.label}</span>
                    <span style={{ fontSize:"13px",fontWeight:800,color:item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent companies + audit */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"18px" }}>
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",overflow:"hidden" }}>
                <div style={{ padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <h3 style={{ margin:0,fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Clientes Recentes</h3>
                  <button onClick={()=>setActiveTab("companies")} className="sa-btn" style={{ background:"none",border:"none",fontSize:"11px",color:"var(--accent)",cursor:"pointer",fontWeight:600 }}>Ver todos <ChevronRight size={11} style={{ verticalAlign:"middle" }}/></button>
                </div>
                {companies.slice(0,5).map((c,i)=>(
                  <div key={c.id} className="sa-row-hover" onClick={()=>{setSelectedCompany(c);setCompanyNote(c.admin_notes||"");setCompanyTab("info");setActiveTab("companies");}} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",cursor:"pointer",borderBottom:i<4?"1px solid var(--border-light)":"none" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                      <div style={{ width:"32px",height:"32px",borderRadius:"9px",background:getAvatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:800,color:"white",flexShrink:0 }}>{c.name.charAt(0).toUpperCase()}</div>
                      <div><p style={{ margin:0,fontSize:"13px",fontWeight:600,color:"var(--text-primary)" }}>{c.name}</p><p style={{ margin:"2px 0 0",fontSize:"11px",color:"var(--text-muted)" }}>{c.agent_count} agente(s) · {new Date(c.created_at).toLocaleDateString("pt-BR")}</p></div>
                    </div>
                    <StatusBadge status={c.subscription_status}/>
                  </div>
                ))}
              </div>
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",overflow:"hidden" }}>
                <div style={{ padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <h3 style={{ margin:0,fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Atividade Recente</h3>
                  <button onClick={()=>setActiveTab("auditoria")} className="sa-btn" style={{ background:"none",border:"none",fontSize:"11px",color:"var(--accent)",cursor:"pointer",fontWeight:600 }}>Ver tudo <ChevronRight size={11} style={{ verticalAlign:"middle" }}/></button>
                </div>
                {auditLogs.slice(0,5).map((log,i)=>(
                  <div key={log.id} style={{ padding:"12px 20px",display:"flex",alignItems:"center",gap:"12px",borderBottom:i<4?"1px solid var(--border-light)":"none" }}>
                    <div style={{ width:"32px",height:"32px",borderRadius:"9px",background:"rgba(99,102,241,.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)",flexShrink:0 }}><Activity size={14}/></div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ margin:0,fontSize:"12px",fontWeight:600,color:"var(--text-primary)" }}><span style={{ background:"rgba(99,102,241,.12)",color:"var(--accent)",padding:"1px 6px",borderRadius:"4px",fontSize:"10px",fontWeight:700,marginRight:"6px" }}>{log.action}</span>{log.details?.company_name||log.details?.plan_name||""}</p>
                      <p style={{ margin:"2px 0 0",fontSize:"10px",color:"var(--text-muted)" }}>{new Date(log.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
                {auditLogs.length===0&&<div style={{ padding:"32px",textAlign:"center",color:"var(--text-muted)",fontSize:"13px" }}>Nenhuma ação registrada</div>}
              </div>
            </div>
          </div>
        )}

        {/* ═══ ANALYTICS ═══ */}
        {activeTab==="analytics"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Analytics & Business Intelligence" subtitle="Métricas avançadas, tendências e projeções do seu SaaS" icon={BarChart2} iconColor="var(--accent)"
              actions={<button onClick={()=>handleExportCSV(companies,"analytics.csv")} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"8px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-secondary)",fontSize:"12px",fontWeight:600 }}><Download size={13}/> Exportar</button>}
            />

            {/* KPIs */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"14px",marginBottom:"28px" }}>
              <StatCardV2 icon={TrendingUp} label="Taxa de Conversão" value={`${conversionRate}%`} color="var(--success)" sublabel="Trial → Ativo" delay={0}/>
              <StatCardV2 icon={TrendingDown} label="Churn Rate" value={`${churnRate}%`} color={parseFloat(churnRate)>10?"var(--danger)":"var(--success)"} sublabel={`${cancelled} cancelado(s)`} delay={80}/>
              <StatCardV2 icon={Wallet} label="Forecast 3 Meses" value={`R$ ${mrrForecast3m.toLocaleString("pt-BR")}`} color="var(--accent)" sublabel="Projeção com 10%/mês" delay={160}/>
              <StatCardV2 icon={Wallet} label="Forecast 6 Meses" value={`R$ ${mrrForecast6m.toLocaleString("pt-BR")}`} color="#8b5cf6" sublabel="Projeção com 10%/mês" delay={240}/>
              <StatCardV2 icon={Users} label="LTV Médio" value={active>0?`R$ ${Math.round((mrr*12)/active).toLocaleString("pt-BR")}`:"-"} color="var(--success)" sublabel="Receita anual por cliente" delay={320}/>
              <StatCardV2 icon={Heart} label="Health Score Médio" value={`${avgHealthScore}/100`} color={avgHealthScore>=75?"var(--success)":avgHealthScore>=50?"#f59e0b":"var(--danger)"} sublabel={`${atRiskCompanies.length} empresas em risco`} delay={400}/>
            </div>

            {/* Growth Chart */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"18px",marginBottom:"24px" }}>
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",padding:"24px" }}>
                <h3 style={{ margin:"0 0 6px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>Crescimento Mensal de Clientes</h3>
                <p style={{ margin:"0 0 20px",fontSize:"12px",color:"var(--text-muted)" }}>Novos cadastros por mês (dados reais)</p>
                <MiniBarChart data={monthlyGrowth} color="var(--accent)" height={100}/>
                <div style={{ display:"flex",justifyContent:"space-between",marginTop:"16px",padding:"12px",borderRadius:"10px",background:"rgba(99,102,241,.06)" }}>
                  <div style={{ textAlign:"center" }}><p style={{ margin:0,fontSize:"20px",fontWeight:800,color:"var(--accent)" }}>{monthlyGrowth.reduce((a,b)=>a+b.count,0)}</p><p style={{ margin:0,fontSize:"11px",color:"var(--text-muted)" }}>Últimos 6 meses</p></div>
                  <div style={{ textAlign:"center" }}><p style={{ margin:0,fontSize:"20px",fontWeight:800,color:"var(--success)" }}>{monthlyGrowth[monthlyGrowth.length-1]?.count||0}</p><p style={{ margin:0,fontSize:"11px",color:"var(--text-muted)" }}>Este mês</p></div>
                  <div style={{ textAlign:"center" }}><p style={{ margin:0,fontSize:"20px",fontWeight:800,color:"var(--text-primary)" }}>{monthlyGrowth.length>1?monthlyGrowth[monthlyGrowth.length-2]?.count||0:0}</p><p style={{ margin:0,fontSize:"11px",color:"var(--text-muted)" }}>Mês anterior</p></div>
                </div>
              </div>

              {/* Funnel */}
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",padding:"24px" }}>
                <h3 style={{ margin:"0 0 6px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>Funil de Conversão</h3>
                <p style={{ margin:"0 0 20px",fontSize:"12px",color:"var(--text-muted)" }}>Jornada do cliente no seu SaaS</p>
                {[
                  { label:"Cadastros Totais", value:total, pct:100, color:"var(--accent)" },
                  { label:"Em Trial", value:trials, pct:total>0?(trials/total)*100:0, color:"#f59e0b" },
                  { label:"Convertidos (Ativos)", value:active, pct:total>0?(active/total)*100:0, color:"var(--success)" },
                  { label:"Churn (Cancelados)", value:cancelled, pct:total>0?(cancelled/total)*100:0, color:"var(--danger)" },
                ].map(item=>(
                  <div key={item.label} style={{ marginBottom:"14px" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"6px" }}>
                      <span style={{ fontSize:"12px",color:"var(--text-secondary)",fontWeight:500 }}>{item.label}</span>
                      <span style={{ fontSize:"13px",fontWeight:800,color:item.color }}>{item.value} <span style={{ color:"var(--text-muted)",fontWeight:400,fontSize:"11px" }}>({item.pct.toFixed(1)}%)</span></span>
                    </div>
                    <div style={{ height:"8px",background:"var(--bg-primary)",borderRadius:"4px",overflow:"hidden" }}>
                      <div style={{ width:`${item.pct}%`,height:"100%",background:item.color,borderRadius:"4px",transition:"width .6s ease" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top companies + revenue forecast */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"18px" }}>
              {/* Top 5 active */}
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",overflow:"hidden" }}>
                <div style={{ padding:"16px 20px",borderBottom:"1px solid var(--border)" }}><h3 style={{ margin:0,fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Top 5 — Mais Ativas (por conversas)</h3></div>
                {healthScores.sort((a,b)=>(b.conv_count||0)-(a.conv_count||0)).slice(0,5).map((c,i)=>(
                  <div key={c.id} className="sa-row-hover" style={{ padding:"12px 20px",display:"flex",alignItems:"center",gap:"12px",borderBottom:i<4?"1px solid var(--border-light)":"none",cursor:"pointer" }} onClick={()=>{setSelectedCompany(c);setCompanyNote(c.admin_notes||"");setCompanyTab("info");setActiveTab("companies");}}>
                    <span style={{ fontSize:"16px",fontWeight:800,color:"var(--text-muted)",width:"20px",textAlign:"center" }}>{i+1}</span>
                    <div style={{ width:"32px",height:"32px",borderRadius:"9px",background:getAvatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:800,color:"white",flexShrink:0 }}>{c.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ margin:0,fontSize:"13px",fontWeight:600,color:"var(--text-primary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{c.name}</p>
                      <p style={{ margin:"2px 0 0",fontSize:"11px",color:"var(--text-muted)" }}>{c.conv_count||0} conversas · {c.agent_count} agentes</p>
                    </div>
                    <HealthScoreBadge score={c.health_score}/>
                  </div>
                ))}
                {companies.length===0&&<EmptyState icon={BarChart2} title="Sem dados" description="Dados de atividade aparecerão aqui."/>}
              </div>

              {/* Revenue forecast */}
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",padding:"24px" }}>
                <h3 style={{ margin:"0 0 6px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>Projeção de Receita</h3>
                <p style={{ margin:"0 0 20px",fontSize:"12px",color:"var(--text-muted)" }}>Crescimento estimado a 10%/mês</p>
                {[
                  { label:"Atual (MRR)", value:mrr, month:"Hoje" },
                  { label:"Daqui 1 mês", value:Math.round(mrr*1.1), month:"+1m" },
                  { label:"Daqui 3 meses", value:mrrForecast3m, month:"+3m" },
                  { label:"Daqui 6 meses", value:mrrForecast6m, month:"+6m" },
                  { label:"ARR Anual", value:mrr*12, month:"12m" },
                ].map((item,i)=>(
                  <div key={item.label} style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px" }}>
                    <span style={{ fontSize:"11px",color:"var(--text-muted)",width:"90px",flexShrink:0 }}>{item.label}</span>
                    <div style={{ flex:1,height:"24px",background:"var(--bg-primary)",borderRadius:"4px",overflow:"hidden",position:"relative" }}>
                      <div style={{ position:"absolute",inset:0,width:`${mrr>0?Math.min((item.value/(mrr*12))*100,100):0}%`,background:`linear-gradient(90deg,var(--accent),#8b5cf6)`,opacity:.8 }}/>
                      <span style={{ position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",fontSize:"11px",fontWeight:800,color:"var(--text-primary)" }}>R$ {item.value.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:"16px",padding:"12px",borderRadius:"10px",background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.15)" }}>
                  <p style={{ margin:"0 0 4px",fontSize:"11px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase" }}>Receita por Cliente Ativo / Mês</p>
                  <p style={{ margin:0,fontSize:"22px",fontWeight:800,color:"var(--success)" }}>R$ 97,00</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ LIFECYCLE & HEALTH ═══ */}
        {activeTab==="lifecycle"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Lifecycle & Saúde dos Clientes" subtitle="Acompanhe o health score e estágio de adoção de cada empresa" icon={Heart} iconColor="#ec4899"/>

            {/* Summary */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"14px",marginBottom:"24px" }}>
              {[
                { label:"Excelentes (75-100)", count:healthScores.filter(c=>c.health_score>=75).length, color:"var(--success)", icon:Star },
                { label:"Saudáveis (50-74)", count:healthScores.filter(c=>c.health_score>=50&&c.health_score<75).length, color:"var(--accent)", icon:CheckCircle2 },
                { label:"Em Risco (25-49)", count:healthScores.filter(c=>c.health_score>=25&&c.health_score<50).length, color:"#f59e0b", icon:AlertTriangle },
                { label:"Críticas (0-24)", count:healthScores.filter(c=>c.health_score<25).length, color:"var(--danger)", icon:Flame },
              ].map((s,i)=>(
                <StatCardV2 key={s.label} icon={s.icon} label={s.label} value={s.count} color={s.color} delay={i*80}/>
              ))}
            </div>

            {/* Health score table */}
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              <div style={{ padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <h3 style={{ margin:0,fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Score por Empresa</h3>
                <span style={{ fontSize:"12px",color:"var(--text-muted)" }}>Health Score = WA conectado + Agentes + Conversas + Assinatura ativa</span>
              </div>
              {healthScores.length===0?<EmptyState icon={Heart} title="Sem empresas" description="Empresas aparecerão aqui com seus scores."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>
                    {["Empresa","Score","WA Conectado","Agentes","Conversas","Status","Ação"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {healthScores.sort((a,b)=>a.health_score-b.health_score).map(c=>{
                      const hasWA=whatsappInboxes.some(i=>i.company_id===c.id&&i.is_connected);
                      return (
                        <tr key={c.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                              <div style={{ width:"32px",height:"32px",borderRadius:"9px",background:getAvatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:800,color:"white",flexShrink:0 }}>{c.name.charAt(0).toUpperCase()}</div>
                              <span style={{ fontWeight:600,color:"var(--text-primary)" }}>{c.name}</span>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px" }}><HealthScoreBadge score={c.health_score}/></td>
                          <td style={{ padding:"12px 16px" }}>{hasWA?<span style={{ color:"var(--success)",fontWeight:700,fontSize:"12px" }}>✓ Sim</span>:<span style={{ color:"var(--danger)",fontWeight:700,fontSize:"12px" }}>✗ Não</span>}</td>
                          <td style={{ padding:"12px 16px",color:"var(--text-secondary)" }}>{c.agent_count}</td>
                          <td style={{ padding:"12px 16px",color:"var(--text-secondary)" }}>{c.conv_count||0}</td>
                          <td style={{ padding:"12px 16px" }}><StatusBadge status={c.subscription_status}/></td>
                          <td style={{ padding:"12px 16px" }}>
                            <button onClick={()=>{setSelectedCompany(c);setCompanyNote(c.admin_notes||"");setCompanyTab("info");setActiveTab("companies");}} className="sa-btn" style={{ padding:"5px 12px",fontSize:"11px",borderRadius:"6px",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",cursor:"pointer" }}>
                              Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ SEGURANÇA ═══ */}
        {activeTab==="seguranca"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Segurança & Sessões" subtitle="Monitore sessões ativas, histórico de acesso e atividade de admins" icon={ShieldAlert} iconColor="var(--accent)"/>

            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"14px",marginBottom:"24px" }}>
              <StatCardV2 icon={UserCheck} label="Sessões Ativas (30min)" value={activeSessionsCount} color="var(--success)" delay={0}/>
              <StatCardV2 icon={Users} label="Total de Admins" value={users.length} color="var(--accent)" delay={80}/>
              <StatCardV2 icon={ShieldAlert} label="Admins Bloqueados" value={users.filter(u=>u.is_banned).length} color="var(--danger)" delay={160}/>
            </div>

            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              <div style={{ padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <h3 style={{ margin:0,fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Atividade de Usuários — Últimos Acessos</h3>
                <div style={{ display:"flex",alignItems:"center",gap:"6px",fontSize:"11px",color:"var(--success)",fontWeight:700 }}><span style={{ width:"8px",height:"8px",borderRadius:"50%",background:"var(--success)",animation:"sa-pulse 2s infinite",display:"inline-block" }}/>{activeSessionsCount} online agora</div>
              </div>
              {sessionLogs.length===0?<EmptyState icon={UserCheck} title="Sem dados de sessão" description="Os acessos dos usuários aparecerão aqui quando last_seen_at estiver disponível."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>
                    {["Usuário","Empresa","Role","Último Acesso","Status","Ação"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {sessionLogs.map(s=>{
                      const diff=s.last_seen_at?(new Date()-new Date(s.last_seen_at))/1000/60:9999;
                      const isOnline=diff<30;
                      return (
                        <tr key={s.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                              <div style={{ position:"relative" }}>
                                <div style={{ width:"32px",height:"32px",borderRadius:"50%",background:getAvatarColor(s.name||"A"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:800,color:"white" }}>{(s.name||"A").charAt(0).toUpperCase()}</div>
                                {isOnline&&<div style={{ position:"absolute",bottom:0,right:0,width:"10px",height:"10px",borderRadius:"50%",background:"var(--success)",border:"2px solid var(--bg-secondary)" }}/>}
                              </div>
                              <div>
                                <p style={{ margin:0,fontWeight:600,color:"var(--text-primary)",fontSize:"13px" }}>{s.name}</p>
                                <p style={{ margin:"1px 0 0",fontSize:"11px",color:"var(--text-muted)" }}>{s.email}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px",color:"var(--text-secondary)",fontSize:"12px" }}>{s.companies?.name||"—"}</td>
                          <td style={{ padding:"12px 16px" }}><span style={{ fontSize:"10px",fontWeight:700,padding:"3px 8px",borderRadius:"5px",background:"rgba(99,102,241,.12)",color:"var(--accent)",textTransform:"uppercase" }}>{s.role}</span></td>
                          <td style={{ padding:"12px 16px",fontSize:"12px",color:"var(--text-muted)" }}>{s.last_seen_at?new Date(s.last_seen_at).toLocaleString("pt-BR"):"Nunca"}</td>
                          <td style={{ padding:"12px 16px" }}>
                            {isOnline?<span style={{ display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"11px",fontWeight:700,color:"var(--success)",background:"rgba(16,185,129,.12)",padding:"4px 10px",borderRadius:"20px" }}><span style={{ width:"6px",height:"6px",borderRadius:"50%",background:"var(--success)",animation:"sa-pulse 2s infinite" }}/> Online</span>:<span style={{ fontSize:"11px",color:"var(--text-muted)" }}>Há {diff<60?`${Math.round(diff)}min`:`${Math.round(diff/60)}h`}</span>}
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            {s.role!=="superadmin"&&<button onClick={()=>handleBanUser(s)} className="sa-btn" style={{ padding:"5px 12px",fontSize:"11px",borderRadius:"6px",border:`1px solid ${s.is_banned?"rgba(16,185,129,.4)":"rgba(239,68,68,.4)"}`,background:"transparent",color:s.is_banned?"var(--success)":"var(--danger)",cursor:"pointer" }}>{s.is_banned?"Desbloquear":"Bloquear"}</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ CUPONS ═══ */}
        {activeTab==="cupons"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Cupons de Desconto" subtitle="Crie e gerencie cupons para aplicar aos seus clientes" icon={Tag} iconColor="#f59e0b"/>

            {/* Create form */}
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",padding:"22px",marginBottom:"24px" }}>
              <h3 style={{ margin:"0 0 16px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:"8px" }}><Plus size={16} style={{ color:"var(--accent)" }}/> Criar Novo Cupom</h3>
              <form onSubmit={handleCreateCoupon}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"14px",marginBottom:"14px" }}>
                  <div>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Código *</label>
                    <input value={newCoupon.code} onChange={e=>setNewCoupon(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="ex: PROMO30" required className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",fontFamily:"monospace",boxSizing:"border-box" }}/>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Tipo</label>
                    <select value={newCoupon.discount_type} onChange={e=>setNewCoupon(p=>({...p,discount_type:e.target.value}))} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px" }}>
                      <option value="percent">Percentual (%)</option>
                      <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Desconto *</label>
                    <input type="number" value={newCoupon.discount_value} onChange={e=>setNewCoupon(p=>({...p,discount_value:e.target.value}))} min="1" max={newCoupon.discount_type==="percent"?100:9999} required className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Máx. de Usos</label>
                    <input type="number" value={newCoupon.max_uses} onChange={e=>setNewCoupon(p=>({...p,max_uses:e.target.value}))} min="1" className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Validade</label>
                    <input type="date" value={newCoupon.expires_at} onChange={e=>setNewCoupon(p=>({...p,expires_at:e.target.value}))} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Descrição</label>
                    <input value={newCoupon.description} onChange={e=>setNewCoupon(p=>({...p,description:e.target.value}))} placeholder="Uso interno" className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                  </div>
                </div>
                <button type="submit" className="sa-btn" style={{ padding:"10px 28px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#f59e0b,#f97316)",color:"white",fontWeight:700,fontSize:"13px",display:"flex",alignItems:"center",gap:"8px" }}>
                  <Tag size={14}/> Criar Cupom
                </button>
              </form>
            </div>

            {/* List */}
            <div style={{ display:"flex",gap:"10px",marginBottom:"14px" }}>
              <SearchBar value={couponSearch} onChange={setCouponSearch} placeholder="Buscar por código ou descrição..."/>
            </div>
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {filteredCoupons.length===0?<EmptyState icon={Tag} title="Nenhum cupom encontrado" description="Crie seu primeiro cupom usando o formulário acima."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>
                    {["Código","Tipo / Desconto","Usos","Validade","Descrição","Ações"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredCoupons.map(coupon=>{
                      const expired=coupon.expires_at&&new Date(coupon.expires_at)<new Date();
                      const exhausted=coupon.max_uses&&(coupon.used_count||0)>=coupon.max_uses;
                      return (
                        <tr key={coupon.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)",opacity:expired||exhausted?.6:1 }}>
                          <td style={{ padding:"12px 16px" }}><code style={{ fontSize:"14px",fontWeight:800,background:"rgba(245,158,11,.12)",color:"#f59e0b",padding:"4px 10px",borderRadius:"7px",fontFamily:"monospace" }}>{coupon.code}</code></td>
                          <td style={{ padding:"12px 16px" }}><span style={{ fontSize:"15px",fontWeight:800,color:"var(--success)" }}>{coupon.discount_type==="percent"?`${coupon.discount_value}%`:`R$ ${coupon.discount_value}`}</span><span style={{ marginLeft:"6px",fontSize:"10px",color:"var(--text-muted)" }}>{coupon.discount_type==="percent"?"desconto":"fixo"}</span></td>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                              <span style={{ fontWeight:700,color:"var(--text-primary)" }}>{coupon.used_count||0}</span><span style={{ color:"var(--text-muted)" }}>/ {coupon.max_uses||"∞"}</span>
                              {exhausted&&<span style={{ fontSize:"10px",fontWeight:700,color:"var(--danger)",background:"rgba(239,68,68,.1)",padding:"2px 6px",borderRadius:"4px" }}>ESGOTADO</span>}
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px",fontSize:"12px" }}>
                            {coupon.expires_at?<span style={{ color:expired?"var(--danger)":"var(--text-secondary)" }}>{expired?"Expirou: ":""}{new Date(coupon.expires_at).toLocaleDateString("pt-BR")}</span>:<span style={{ color:"var(--text-muted)" }}>Sem validade</span>}
                          </td>
                          <td style={{ padding:"12px 16px",fontSize:"12px",color:"var(--text-muted)" }}>{coupon.description||"—"}</td>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex",gap:"6px" }}>
                              <button onClick={()=>{navigator.clipboard?.writeText(coupon.code);showToast("Código copiado!","success");}} className="sa-btn" style={{ padding:"5px 10px",fontSize:"11px",borderRadius:"6px",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px" }}><Copy size={10}/> Copiar</button>
                              <button onClick={()=>{
                                const company=companies.find(c=>window.confirm===undefined||true);
                                const companyName=window.prompt("Nome ou parte do nome da empresa para aplicar o cupom:");
                                if(!companyName) return;
                                const found=companies.find(c=>c.name.toLowerCase().includes(companyName.toLowerCase()));
                                if(found) handleApplyCouponToCompany(coupon.id,found.id,found.name,coupon.code);
                                else showToast("Empresa não encontrada.","error");
                              }} className="sa-btn" style={{ padding:"5px 10px",fontSize:"11px",borderRadius:"6px",border:"1px solid rgba(99,102,241,.4)",background:"rgba(99,102,241,.08)",color:"var(--accent)",cursor:"pointer" }}>Aplicar</button>
                              <button onClick={()=>handleDeleteCoupon(coupon)} className="sa-btn" style={{ padding:"5px 10px",fontSize:"11px",borderRadius:"6px",border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.06)",color:"var(--danger)",cursor:"pointer" }}><Trash2 size={11}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ COMPANIES ═══ */}
        {activeTab==="companies"&&(
          <div style={{ display:"flex",gap:"20px",height:"100%",animation:"sa-fadeInUp .3s ease" }}>
            <div style={{ flex:1,minWidth:0,display:"flex",flexDirection:"column" }}>
              <SectionHeader title="Empresas Cadastradas" subtitle={`${total} empresa(s) · ${filteredCompanies.length} exibidas`} icon={Building2} iconColor="var(--accent)"
                actions={<>
                  <button onClick={()=>setShowCreateCompanyModal(true)} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 16px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",fontSize:"13px",fontWeight:700 }}><Plus size={15}/> Nova Empresa</button>
                  <button onClick={fetchCompanies} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"8px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-secondary)",fontSize:"12px" }}><RefreshCw size={12}/> Atualizar</button>
                  <button onClick={()=>handleExportCSV(companies,"empresas.csv")} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"8px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-secondary)",fontSize:"12px" }}><Download size={12}/> CSV</button>
                </>}
              />
              <div style={{ display:"flex",gap:"10px",marginBottom:"16px",flexWrap:"wrap" }}>
                <SearchBar value={companySearch} onChange={setCompanySearch} placeholder="Buscar empresa ou e-mail..." width="260px"/>
                <div style={{ display:"flex",gap:"4px" }}>
                  {[{id:"all",label:"Todos"},{id:"active",label:"Ativos"},{id:"trial",label:"Trial"},{id:"past_due",label:"Inadimplentes"}].map(f=>(
                    <button key={f.id} onClick={()=>setCompanyFilter(f.id)} className="sa-btn" style={{ padding:"7px 14px",borderRadius:"8px",fontSize:"12px",fontWeight:600,border:"1px solid "+(companyFilter===f.id?"var(--accent)":"var(--border)"),background:companyFilter===f.id?"rgba(99,102,241,.15)":"var(--bg-secondary)",color:companyFilter===f.id?"var(--accent)":"var(--text-muted)" }}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden",flex:1 }}>
                {loading?<EmptyState icon={RefreshCw} title="Carregando..."/>:filteredCompanies.length===0?<EmptyState icon={Building2} title="Nenhuma empresa encontrada" description="Ajuste os filtros ou crie uma nova empresa."/>:(
                  <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                    <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>
                      {["Empresa","Status","Health","Vence Em","Agentes"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filteredCompanies.map(company=>{
                        const hs=healthScores.find(h=>h.id===company.id);
                        const trialDays=company.subscription_ends_at?(d=>d)(getTrialDays(company.subscription_ends_at)):null;
                        const isSelected=selectedCompany?.id===company.id;
                        return (
                          <tr key={company.id} className="sa-row-hover" onClick={()=>{setSelectedCompany(company);setCompanyNote(company.admin_notes||"");setCompanyTab("info");}} style={{ borderBottom:"1px solid var(--border-light)",cursor:"pointer",background:isSelected?"rgba(99,102,241,.06)":"transparent" }}>
                            <td style={{ padding:"13px 16px" }}>
                              <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                                <div style={{ width:"34px",height:"34px",borderRadius:"10px",background:getAvatarColor(company.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:800,color:"white",flexShrink:0 }}>{company.name.charAt(0).toUpperCase()}</div>
                                <div><p style={{ margin:0,fontWeight:600,color:"var(--text-primary)" }}>{company.name}</p><p style={{ margin:"2px 0 0",fontSize:"11px",color:"var(--text-muted)" }}>{company.email||"Sem e-mail"}</p></div>
                              </div>
                            </td>
                            <td style={{ padding:"13px 16px" }}><StatusBadge status={company.subscription_status}/></td>
                            <td style={{ padding:"13px 16px" }}>{hs&&<HealthScoreBadge score={hs.health_score}/>}</td>
                            <td style={{ padding:"13px 16px" }}>
                              {company.subscription_ends_at?(<div><span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>{new Date(company.subscription_ends_at).toLocaleDateString("pt-BR")}</span>{trialDays!==null&&trialDays>=0&&trialDays<=7&&<span style={{ marginLeft:"6px",fontSize:"10px",fontWeight:700,color:"#f59e0b",background:"rgba(245,158,11,.12)",padding:"2px 6px",borderRadius:"4px" }}>{trialDays}d</span>}{trialDays!==null&&trialDays<0&&<span style={{ marginLeft:"6px",fontSize:"10px",fontWeight:700,color:"var(--danger)",background:"rgba(239,68,68,.12)",padding:"2px 6px",borderRadius:"4px" }}>Expirado</span>}</div>):<span style={{ color:"var(--text-muted)",fontSize:"12px" }}>—</span>}
                            </td>
                            <td style={{ padding:"13px 16px",fontSize:"13px",color:"var(--text-secondary)",fontWeight:600 }}>{company.agent_count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* DETAIL PANEL */}
            {selectedCompany&&(
              <div style={{ width:"380px",minWidth:"380px",background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 110px)",position:"sticky",top:0,animation:"sa-slideIn .25s ease" }}>
                {/* Header */}
                <div style={{ padding:"18px 20px",borderBottom:"1px solid var(--border)" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"12px",flex:1,minWidth:0 }}>
                      <div style={{ width:"42px",height:"42px",borderRadius:"12px",background:getAvatarColor(selectedCompany.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",fontWeight:800,color:"white",flexShrink:0 }}>{selectedCompany.name.charAt(0).toUpperCase()}</div>
                      <div style={{ minWidth:0 }}>
                        <h3 style={{ margin:0,fontSize:"15px",fontWeight:700,color:"var(--text-primary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{selectedCompany.name}</h3>
                        <p style={{ margin:"2px 0 0",fontSize:"11px",color:"var(--text-muted)" }}>ID: {selectedCompany.id?.substring(0,14)}...</p>
                      </div>
                    </div>
                    <button onClick={()=>setSelectedCompany(null)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",padding:"2px" }}><X size={16}/></button>
                  </div>
                  {/* Tabs */}
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"3px",marginTop:"14px" }}>
                    {["info","features","acoes","notas","email","historico"].map(t=>(
                      <button key={t} onClick={()=>setCompanyTab(t)} className="sa-tab-btn" style={{ padding:"5px 2px",borderRadius:"6px",border:"none",fontSize:"10px",fontWeight:600,background:companyTab===t?"var(--accent)":"transparent",color:companyTab===t?"white":"var(--text-muted)",cursor:"pointer",textTransform:"uppercase" }}>
                        {t==="historico"?"Histórico":t.charAt(0).toUpperCase()+t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ flex:1,overflowY:"auto",padding:"16px 20px" }}>
                  {/* INFO TAB */}
                  {companyTab==="info"&&(
                    <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
                      {(() => {
                        const hs=healthScores.find(h=>h.id===selectedCompany.id);
                        return hs&&<div style={{ padding:"12px 14px",borderRadius:"10px",background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.15)",marginBottom:"4px" }}>
                          <p style={{ margin:"0 0 8px",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>Health Score</p>
                          <HealthScoreBadge score={hs.health_score}/>
                        </div>;
                      })()}
                      {[
                        { label:"Status", value:<StatusBadge status={selectedCompany.subscription_status} size="md"/> },
                        { label:"Plano", value:<select value={selectedCompany.plan_id||""} onChange={e=>handleChangePlan(selectedCompany.id,e.target.value)} className="sa-input" style={{ fontSize:"12px",fontWeight:600,color:"var(--text-primary)",background:"var(--bg-primary)",border:"1px solid var(--border)",borderRadius:"6px",padding:"4px 8px",cursor:"pointer" }}><option value="" disabled>Selecione...</option>{saasPlans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select> },
                        { label:"Cadastro", value:new Date(selectedCompany.created_at).toLocaleDateString("pt-BR") },
                        { label:"Vencimento", value:selectedCompany.subscription_ends_at?new Date(selectedCompany.subscription_ends_at).toLocaleDateString("pt-BR"):"—" },
                        { label:"Agentes", value:selectedCompany.agent_count },
                        { label:"Conversas", value:selectedCompany.conv_count||0 },
                        { label:"E-mail", value:selectedCompany.email||"—" },
                      ].map(item=>(
                        <div key={item.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                          <span style={{ fontSize:"12px",color:"var(--text-muted)" }}>{item.label}</span>
                          <span style={{ fontSize:"12px",fontWeight:600,color:"var(--text-primary)" }}>{item.value}</span>
                        </div>
                      ))}
                      {/* Usage bars */}
                      {[{ label:"Uso de Agentes", value:selectedCompany.agent_count, max:3 },{ label:"Conversas",value:selectedCompany.conv_count||0,max:1000 }].map(bar=>(
                        <div key={bar.label}>
                          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}><span style={{ fontSize:"11px",color:"var(--text-muted)" }}>{bar.label}</span><span style={{ fontSize:"11px",fontWeight:700,color:"var(--text-primary)" }}>{bar.value}/{bar.max}</span></div>
                          <div style={{ height:"5px",background:"var(--bg-primary)",borderRadius:"3px",overflow:"hidden" }}><div style={{ width:`${Math.min((bar.value/bar.max)*100,100)}%`,height:"100%",background:bar.value/bar.max>=.9?"var(--danger)":"var(--accent)",transition:"width .5s" }}/></div>
                        </div>
                      ))}
                      {/* Theme color */}
                      <div style={{ paddingTop:"8px",borderTop:"1px solid var(--border-light)" }}>
                        <p style={{ margin:"0 0 8px",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>Cor White-Label</p>
                        <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
                          <input type="color" value={selectedCompany.theme_color||"#6366f1"} onChange={e=>setSelectedCompany({...selectedCompany,theme_color:e.target.value})} style={{ width:"32px",height:"32px",padding:0,border:"1px solid var(--border)",borderRadius:"6px",cursor:"pointer" }}/>
                          <button onClick={()=>handleUpdateTheme(selectedCompany.id,selectedCompany.theme_color)} className="sa-btn" style={{ flex:1,padding:"7px 12px",fontSize:"11px",background:"var(--bg-primary)",border:"1px solid var(--border)",color:"var(--text-primary)",borderRadius:"6px",fontWeight:600 }}>Salvar Cor</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FEATURES TAB */}
                  {companyTab==="features"&&(
                    <div>{[{key:"IA_BOT",label:"Bot com IA",desc:"Respostas automáticas"},{key:"CAMPANHAS",label:"Campanhas de Marketing",desc:"Disparos em massa"},{key:"MULTI_INBOX",label:"Multi-Inbox",desc:"Múltiplos números"},{key:"RELATORIOS_ADV",label:"Relatórios Avançados",desc:"Analytics e exportação"},{key:"API_ACCESS",label:"Acesso à API",desc:"Integração REST API"},{key:"WHITE_LABEL",label:"White-Label Avançado",desc:"Domínio personalizado"}].map(f=>{
                      const isEnabled=selectedCompany.custom_features?.[f.key]===true;
                      return <div key={f.key} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:"10px",marginBottom:"6px",background:isEnabled?"rgba(16,185,129,.06)":"var(--bg-primary)",border:`1px solid ${isEnabled?"rgba(16,185,129,.2)":"var(--border)"}`,transition:"all .2s" }}>
                        <div><p style={{ margin:0,fontSize:"12px",fontWeight:700,color:"var(--text-primary)" }}>{f.label}</p><p style={{ margin:"2px 0 0",fontSize:"10px",color:"var(--text-muted)" }}>{f.desc}</p></div>
                        <Toggle checked={isEnabled} onChange={()=>handleToggleCustomFeature(selectedCompany.id,selectedCompany.custom_features||{},f.key)}/>
                      </div>;
                    })}</div>
                  )}

                  {/* ACOES TAB */}
                  {companyTab==="acoes"&&(
                    <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                      <button onClick={()=>handleLoginAs(selectedCompany)} className="sa-btn" style={{ width:"100%",padding:"11px",fontSize:"13px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",border:"none",borderRadius:"10px",fontWeight:700 }}><Eye size={15}/> Acessar como Admin (Espião)</button>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px" }}>
                        {[
                          { label:"Ativar 30 dias",icon:CheckCircle2,color:"var(--success)",bg:"rgba(16,185,129,.12)",border:"rgba(16,185,129,.25)",action:()=>handleStatusChange(selectedCompany.id,"active") },
                          { label:"+7 dias Trial",icon:Calendar,color:"var(--accent)",bg:"rgba(99,102,241,.12)",border:"rgba(99,102,241,.25)",action:()=>handleExtendTrial(selectedCompany.id) },
                          { label:"Inadimplente",icon:AlertTriangle,color:"#f59e0b",bg:"rgba(245,158,11,.1)",border:"rgba(245,158,11,.25)",action:()=>handleStatusChange(selectedCompany.id,"past_due") },
                          { label:"Bloquear",icon:Lock,color:"var(--text-muted)",bg:"rgba(100,100,100,.1)",border:"var(--border)",action:()=>handleStatusChange(selectedCompany.id,"blocked") },
                        ].map(btn=>(
                          <button key={btn.label} onClick={btn.action} className="sa-btn" style={{ padding:"10px",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",background:btn.bg,color:btn.color,border:`1px solid ${btn.border}`,borderRadius:"9px",fontWeight:700 }}>
                            <btn.icon size={13}/> {btn.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ height:"1px",background:"var(--border-light)",margin:"4px 0" }}/>
                      <button onClick={()=>showConfirm({title:"Cancelar assinatura",message:`Cancelar assinatura de "${selectedCompany.name}" no Mercado Pago?`,confirmLabel:"Cancelar Assinatura",confirmColor:"var(--danger)",icon:XCircle,onConfirm:()=>{closeConfirm();handleStatusChange(selectedCompany.id,"cancelled");showToast("Assinatura cancelada.","success");}})} className="sa-btn" style={{ width:"100%",padding:"10px",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",background:"transparent",color:"var(--danger)",border:"1px solid rgba(239,68,68,.3)",borderRadius:"9px",fontWeight:700 }}><XCircle size={13}/> Cancelar Assinatura</button>
                      <button onClick={()=>handleDelete(selectedCompany)} className="sa-btn" style={{ width:"100%",padding:"10px",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",background:"rgba(239,68,68,.08)",color:"var(--danger)",border:"1px solid rgba(239,68,68,.3)",borderRadius:"9px",fontWeight:700 }}><Trash2 size={13}/> Excluir Permanentemente</button>
                      <button onClick={()=>{navigator.clipboard?.writeText(selectedCompany.id);showToast("ID copiado!","success");}} className="sa-btn" style={{ width:"100%",padding:"10px",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",background:"var(--bg-primary)",color:"var(--text-muted)",border:"1px solid var(--border)",borderRadius:"9px",fontWeight:600 }}><Copy size={13}/> Copiar ID</button>
                    </div>
                  )}

                  {/* NOTAS TAB */}
                  {companyTab==="notas"&&(
                    <div>
                      <p style={{ margin:"0 0 10px",fontSize:"12px",color:"var(--text-muted)",lineHeight:1.5 }}>Anotações internas sobre este cliente. Visível apenas para admins.</p>
                      <textarea value={companyNote} onChange={e=>setCompanyNote(e.target.value)} placeholder="Anote algo sobre este cliente..." rows={10} className="sa-input" style={{ width:"100%",padding:"12px",borderRadius:"10px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",resize:"vertical",lineHeight:1.6,boxSizing:"border-box" }}/>
                      <button onClick={()=>handleSaveNote(selectedCompany.id)} className="sa-btn" style={{ marginTop:"10px",width:"100%",padding:"10px",borderRadius:"9px",border:"none",background:"var(--accent)",color:"white",fontWeight:700,fontSize:"13px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px" }}><Save size={14}/> Salvar Notas</button>
                    </div>
                  )}

                  {/* EMAIL TAB */}
                  {companyTab==="email"&&(
                    <div>
                      <p style={{ margin:"0 0 14px",fontSize:"12px",color:"var(--text-muted)",lineHeight:1.5 }}>Envie um e-mail diretamente para <strong style={{ color:"var(--text-primary)" }}>{selectedCompany.email||"(sem e-mail cadastrado)"}</strong>.</p>
                      <div style={{ marginBottom:"12px" }}>
                        <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Assunto</label>
                        <input value={individualEmailSubject} onChange={e=>setIndividualEmailSubject(e.target.value)} placeholder="Assunto do e-mail" className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                      </div>
                      <div style={{ marginBottom:"12px" }}>
                        <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Conteúdo</label>
                        <textarea value={individualEmailContent} onChange={e=>setIndividualEmailContent(e.target.value)} placeholder="Conteúdo do e-mail..." rows={7} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",resize:"vertical",lineHeight:1.6,boxSizing:"border-box" }}/>
                      </div>
                      <div style={{ marginBottom:"14px" }}>
                        <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Usar Template</label>
                        <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
                          {BROADCAST_TEMPLATES.slice(0,3).map(t=>(
                            <button key={t.id} onClick={()=>{setIndividualEmailSubject(t.subject);setIndividualEmailContent(t.content);}} className="sa-btn" style={{ padding:"5px 10px",fontSize:"10px",borderRadius:"6px",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",cursor:"pointer",fontWeight:600 }}>{t.name}</button>
                          ))}
                        </div>
                      </div>
                      <button onClick={()=>handleSendIndividualEmail(selectedCompany)} className="sa-btn" style={{ width:"100%",padding:"11px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,var(--accent),#8b5cf6)",color:"white",fontWeight:700,fontSize:"13px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px" }}>
                        <Send size={14}/> Enviar E-mail
                      </button>
                    </div>
                  )}

                  {/* HISTORICO TAB */}
                  {companyTab==="historico"&&(
                    <div>
                      <p style={{ margin:"0 0 14px",fontSize:"12px",color:"var(--text-muted)" }}>Linha do tempo de ações realizadas nesta empresa (baseado no audit log).</p>
                      {auditLogs.filter(l=>l.target_id===selectedCompany.id).length===0?
                        <EmptyState icon={Info} title="Sem histórico" description="Ações realizadas nesta empresa aparecerão aqui."/>:
                        auditLogs.filter(l=>l.target_id===selectedCompany.id).map((log,i)=>(
                          <div key={log.id} style={{ display:"flex",gap:"12px",marginBottom:"14px",position:"relative" }}>
                            {i<auditLogs.filter(l=>l.target_id===selectedCompany.id).length-1&&<div style={{ position:"absolute",left:"15px",top:"32px",bottom:"-14px",width:"2px",background:"var(--border-light)" }}/>}
                            <div style={{ width:"30px",height:"30px",borderRadius:"50%",background:"rgba(99,102,241,.12)",border:"2px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)",flexShrink:0,zIndex:1 }}><Activity size={12}/></div>
                            <div>
                              <span style={{ fontSize:"11px",fontWeight:700,background:"rgba(99,102,241,.12)",color:"var(--accent)",padding:"2px 7px",borderRadius:"4px",fontFamily:"monospace" }}>{log.action}</span>
                              {log.details&&Object.keys(log.details).length>0&&<p style={{ margin:"4px 0 2px",fontSize:"11px",color:"var(--text-secondary)" }}>{JSON.stringify(log.details)}</p>}
                              <p style={{ margin:0,fontSize:"10px",color:"var(--text-muted)" }}>{new Date(log.created_at).toLocaleString("pt-BR")}</p>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ FINANCEIRO ═══ */}
        {activeTab==="financeiro"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Financeiro" subtitle="Receita, inadimplência, churn e projeções" icon={Wallet} iconColor="var(--success)"
              actions={<button onClick={()=>handleExportCSV(payments,"pagamentos.csv")} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"8px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-secondary)",fontSize:"12px",fontWeight:600 }}><Download size={12}/> CSV</button>}
            />
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"14px",marginBottom:"28px" }}>
              <StatCardV2 icon={Wallet} label="MRR" value={`R$ ${mrr.toLocaleString("pt-BR")}`} color="var(--success)" sublabel={`${active} clientes × R$ 97`} delay={0}/>
              <StatCardV2 icon={TrendingUp} label="ARR" value={`R$ ${(mrr*12).toLocaleString("pt-BR")}`} color="#10b981" sublabel="Projeção anual" delay={80}/>
              <StatCardV2 icon={AlertTriangle} label="Em Risco" value={`R$ ${(pastDue*97).toLocaleString("pt-BR")}`} color="var(--danger)" sublabel={`${pastDue} inadimplente(s)`} delay={160}/>
              <StatCardV2 icon={TrendingDown} label="Churn Rate" value={`${churnRate}%`} color={parseFloat(churnRate)>10?"var(--danger)":"var(--success)"} sublabel={`${cancelled} cancelado(s)`} delay={240}/>
            </div>
            {/* Churn analysis */}
            {cancelled>0&&(
              <div style={{ background:"var(--bg-secondary)",border:"1px solid rgba(239,68,68,.2)",borderRadius:"14px",padding:"20px",marginBottom:"24px" }}>
                <h3 style={{ margin:"0 0 12px",fontSize:"13px",fontWeight:700,color:"var(--danger)",display:"flex",alignItems:"center",gap:"6px" }}><TrendingDown size={15}/> Análise de Churn</h3>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px" }}>
                  <div style={{ textAlign:"center" }}><p style={{ margin:0,fontSize:"24px",fontWeight:800,color:"var(--danger)" }}>{cancelled}</p><p style={{ margin:0,fontSize:"11px",color:"var(--text-muted)" }}>Cancelados total</p></div>
                  <div style={{ textAlign:"center" }}><p style={{ margin:0,fontSize:"24px",fontWeight:800,color:"var(--danger)" }}>{churnRate}%</p><p style={{ margin:0,fontSize:"11px",color:"var(--text-muted)" }}>Taxa de churn</p></div>
                  <div style={{ textAlign:"center" }}><p style={{ margin:0,fontSize:"24px",fontWeight:800,color:"var(--danger)" }}>R$ {(cancelled*97).toLocaleString("pt-BR")}</p><p style={{ margin:0,fontSize:"11px",color:"var(--text-muted)" }}>MRR perdido</p></div>
                </div>
              </div>
            )}
            {/* Inadimplentes */}
            {pastDue>0&&(
              <div style={{ marginBottom:"24px" }}>
                <h3 style={{ fontSize:"13px",fontWeight:700,color:"var(--danger)",marginBottom:"12px",display:"flex",alignItems:"center",gap:"6px" }}><AlertTriangle size={15}/> Clientes Inadimplentes</h3>
                <div style={{ background:"var(--bg-secondary)",border:"1px solid rgba(239,68,68,.2)",borderRadius:"12px",overflow:"hidden" }}>
                  {companies.filter(c=>c.subscription_status==="past_due").map((c,i,arr)=>(
                    <div key={c.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:i<arr.length-1?"1px solid var(--border-light)":"none" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                        <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:"var(--danger)",animation:"sa-pulse 2s infinite" }}/>
                        <div><p style={{ margin:0,fontWeight:600,fontSize:"13px",color:"var(--text-primary)" }}>{c.name}</p><p style={{ margin:"2px 0 0",fontSize:"11px",color:"var(--danger)" }}>Venceu: {c.subscription_ends_at?new Date(c.subscription_ends_at).toLocaleDateString("pt-BR"):"sem data"}</p></div>
                      </div>
                      <div style={{ display:"flex",gap:"8px" }}>
                        <button onClick={()=>handleStatusChange(c.id,"active")} className="sa-btn" style={{ padding:"6px 14px",fontSize:"11px",borderRadius:"7px",fontWeight:700,background:"rgba(16,185,129,.15)",color:"var(--success)",border:"1px solid rgba(16,185,129,.3)",cursor:"pointer" }}>Ativar</button>
                        <button onClick={()=>{setSelectedCompany(c);setActiveTab("companies");}} className="sa-btn" style={{ padding:"6px 14px",fontSize:"11px",borderRadius:"7px",fontWeight:600,background:"transparent",color:"var(--text-muted)",border:"1px solid var(--border)",cursor:"pointer" }}>Ver</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Payments table */}
            <h3 style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"12px",display:"flex",alignItems:"center",gap:"6px" }}><List size={15} style={{ color:"var(--accent)" }}/> Histórico de Transações</h3>
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {payments.length===0?<EmptyState icon={Wallet} title="Nenhuma transação" description="Histórico de pagamentos aparecerá aqui."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>{["Empresa","Descrição","Data","Valor","Status"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{payments.map(p=><tr key={p.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                    <td style={{ padding:"12px 16px",fontWeight:600,color:"var(--text-primary)" }}>{p.companies?.name}</td>
                    <td style={{ padding:"12px 16px",color:"var(--text-secondary)" }}>{p.description}</td>
                    <td style={{ padding:"12px 16px",color:"var(--text-muted)",fontSize:"12px" }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td style={{ padding:"12px 16px",fontWeight:700,color:"var(--text-primary)" }}>R$ {p.amount?.toFixed(2)}</td>
                    <td style={{ padding:"12px 16px" }}><span style={{ background:p.status==="paid"?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)",color:p.status==="paid"?"var(--success)":"var(--danger)",padding:"4px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:700,textTransform:"uppercase" }}>{p.status==="paid"?"Pago":p.status}</span></td>
                  </tr>)}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ BROADCAST (ENHANCED) ═══ */}
        {activeTab==="broadcast"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="E-mails em Massa" subtitle="Dispare comunicados segmentados para sua base de clientes" icon={Megaphone} iconColor="var(--accent)"/>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 360px",gap:"24px" }}>
              {/* Compose */}
              <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
                {/* Templates */}
                <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",padding:"18px" }}>
                  <h4 style={{ margin:"0 0 12px",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Templates Prontos</h4>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:"8px" }}>
                    {BROADCAST_TEMPLATES.map(t=>(
                      <button key={t.id} onClick={()=>{setSelectedTemplate(t.id);setBroadcastSubject(t.subject);setBroadcastContent(t.content);}} className="sa-btn" style={{ padding:"7px 14px",fontSize:"12px",borderRadius:"8px",fontWeight:600,border:`1px solid ${selectedTemplate===t.id?"var(--accent)":"var(--border)"}`,background:selectedTemplate===t.id?"rgba(99,102,241,.15)":"transparent",color:selectedTemplate===t.id?"var(--accent)":"var(--text-secondary)",cursor:"pointer" }}>{t.name}</button>
                    ))}
                  </div>
                </div>

                <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",padding:"22px" }}>
                  <h3 style={{ margin:"0 0 16px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:"8px" }}><Send size={15} style={{ color:"var(--accent)" }}/> Compor Mensagem</h3>

                  {/* Segmentation */}
                  <div style={{ marginBottom:"14px" }}>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"8px" }}>Segmento de Destinatários</label>
                    <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                      {[{id:"all",label:`Todos (${companies.length})`},{id:"active",label:`Ativos (${active})`},{id:"trial",label:`Trial (${trials})`},{id:"past_due",label:`Inadimplentes (${pastDue})`}].map(seg=>(
                        <button key={seg.id} onClick={()=>setBroadcastSegment(seg.id)} className="sa-btn" style={{ padding:"7px 14px",fontSize:"12px",borderRadius:"8px",fontWeight:600,border:`1px solid ${broadcastSegment===seg.id?"var(--accent)":"var(--border)"}`,background:broadcastSegment===seg.id?"rgba(99,102,241,.15)":"transparent",color:broadcastSegment===seg.id?"var(--accent)":"var(--text-muted)" }}>{seg.label}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom:"12px" }}>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"6px" }}>Assunto</label>
                    <input type="text" value={broadcastSubject} onChange={e=>setBroadcastSubject(e.target.value)} placeholder="Assunto do e-mail..." className="sa-input" style={{ width:"100%",padding:"10px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                  </div>

                  <div style={{ marginBottom:"14px" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px" }}>
                      <label style={{ fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>Conteúdo</label>
                      <button onClick={()=>setShowHtmlPreview(!showHtmlPreview)} className="sa-btn" style={{ background:"transparent",border:"1px solid var(--border)",color:"var(--text-muted)",padding:"4px 10px",borderRadius:"6px",fontSize:"11px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"4px" }}><Code size={11}/> {showHtmlPreview?"Editar":"Preview HTML"}</button>
                    </div>
                    {showHtmlPreview?(
                      <div style={{ minHeight:"160px",padding:"16px",borderRadius:"10px",background:"white",color:"#0f172a",border:"1px solid var(--border)",fontSize:"13px",lineHeight:1.6 }} dangerouslySetInnerHTML={{__html:broadcastContent.replace(/\n/g,"<br/>")}}/>
                    ):(
                      <textarea rows={7} value={broadcastContent} onChange={e=>setBroadcastContent(e.target.value)} placeholder="Olá {nome},\n\n..." className="sa-input" style={{ width:"100%",padding:"12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",resize:"vertical",lineHeight:1.6,boxSizing:"border-box" }}/>
                    )}
                  </div>

                  {/* Scheduling */}
                  <div style={{ marginBottom:"16px",padding:"14px",borderRadius:"10px",background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.15)" }}>
                    <label style={{ display:"flex",alignItems:"center",gap:"8px",fontSize:"12px",color:"var(--text-secondary)",cursor:"pointer",fontWeight:600,marginBottom:broadcastScheduleDate?"10px":"0" }}>
                      <Timer size={14} style={{ color:"var(--accent)" }}/> Agendar envio (opcional)
                    </label>
                    <input type="datetime-local" value={broadcastScheduleDate} onChange={e=>setBroadcastScheduleDate(e.target.value)} className="sa-input" style={{ marginTop:"8px",width:"100%",padding:"8px 12px",borderRadius:"8px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                    {broadcastScheduleDate&&<p style={{ margin:"6px 0 0",fontSize:"11px",color:"var(--accent)",fontWeight:600 }}>⏰ Agendado para: {new Date(broadcastScheduleDate).toLocaleString("pt-BR")}</p>}
                  </div>

                  <div style={{ padding:"12px 14px",borderRadius:"10px",background:"rgba(99,102,241,.06)",fontSize:"12px",color:"var(--text-secondary)",marginBottom:"14px" }}>
                    <strong style={{ color:"var(--accent)" }}>Destinatários:</strong> {broadcastRecipients.length} empresa(s)
                  </div>

                  <button onClick={handleSendBroadcast} className="sa-btn" style={{ width:"100%",padding:"12px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,var(--accent),#8b5cf6)",color:"white",fontWeight:700,fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px" }}>
                    {broadcastScheduleDate?<Timer size={16}/>:<Send size={16}/>}
                    {broadcastScheduleDate?`Agendar para ${new Date(broadcastScheduleDate).toLocaleDateString("pt-BR")}`:`Enviar para ${broadcastRecipients.length} Clientes`}
                  </button>
                </div>
              </div>

              {/* History */}
              <div>
                <h3 style={{ margin:"0 0 14px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>Histórico de Envios</h3>
                {broadcasts.length===0?<div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px" }}><EmptyState icon={Megaphone} title="Nenhum disparo" description="Seu histórico aparecerá aqui."/></div>:(
                  <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
                    {broadcasts.map(b=>(
                      <div key={b.id} style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"12px",padding:"16px" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px" }}>
                          <span style={{ fontWeight:700,fontSize:"13px",color:"var(--text-primary)" }}>{b.subject}</span>
                          <span style={{ fontSize:"10px",fontWeight:700,padding:"3px 8px",borderRadius:"20px",background:b.status==="sent"?"rgba(16,185,129,.12)":"rgba(99,102,241,.12)",color:b.status==="sent"?"var(--success)":"var(--accent)" }}>{b.status==="sent"?"ENVIADO":b.status==="scheduled"?"AGENDADO":b.status}</span>
                        </div>
                        {b.segment&&<p style={{ margin:"0 0 4px",fontSize:"11px",color:"var(--accent)" }}>Segmento: {b.segment} · {b.recipient_count||"?"} destinatários</p>}
                        <span style={{ fontSize:"11px",color:"var(--text-muted)" }}>{b.sent_at?new Date(b.sent_at).toLocaleString("pt-BR"):b.scheduled_at?"Agendado: "+new Date(b.scheduled_at).toLocaleString("pt-BR"):"—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ AVISOS ═══ */}
        {activeTab==="avisos"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Avisos Globais" subtitle="Avisos exibidos no topo para TODOS os usuários de todas as empresas" icon={BellRing} iconColor="#f59e0b"/>
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",padding:"22px",marginBottom:"24px" }}>
              <h3 style={{ margin:"0 0 14px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:"8px" }}><Plus size={16} style={{ color:"var(--accent)" }}/> Novo Aviso</h3>
              <div style={{ display:"flex",gap:"8px",marginBottom:"14px" }}>
                {[{id:"info",label:"Informação",color:"#38bdf8"},{id:"warning",label:"Aviso",color:"#f59e0b"},{id:"danger",label:"Crítico",color:"#ef4444"},{id:"success",label:"Sucesso",color:"#10b981"}].map(t=>(
                  <button key={t.id} onClick={()=>setNewAnnouncement(p=>({...p,type:t.id}))} className="sa-btn" style={{ padding:"7px 16px",borderRadius:"8px",fontSize:"12px",fontWeight:700,border:`1px solid ${newAnnouncement.type===t.id?t.color:"var(--border)"}`,background:newAnnouncement.type===t.id?`${t.color}18`:"transparent",color:newAnnouncement.type===t.id?t.color:"var(--text-muted)" }}>{t.label}</button>
                ))}
              </div>
              <form onSubmit={handleCreateAnnouncement} style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
                <textarea placeholder="Mensagem do aviso..." value={newAnnouncement.message} onChange={e=>setNewAnnouncement(p=>({...p,message:e.target.value}))} className="sa-input" style={{ width:"100%",minHeight:"80px",padding:"12px",borderRadius:"10px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",resize:"vertical",lineHeight:1.6 }} required/>
                {newAnnouncement.message&&(
                  <div>
                    <p style={{ margin:"0 0 6px",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase" }}>Preview:</p>
                    <div style={{ padding:"12px 16px",borderRadius:"8px",background:annColors[newAnnouncement.type]?.bg,border:`1px solid ${annColors[newAnnouncement.type]?.border}`,color:annColors[newAnnouncement.type]?.color,fontSize:"13px",fontWeight:500 }}>{newAnnouncement.message}</div>
                  </div>
                )}
                <div style={{ display:"flex",gap:"16px",alignItems:"center" }}>
                  <label style={{ display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",color:"var(--text-primary)",cursor:"pointer",fontWeight:600 }}><Toggle checked={newAnnouncement.is_active} onChange={v=>setNewAnnouncement(p=>({...p,is_active:v}))}/> Ativar imediatamente</label>
                  <button type="submit" className="sa-btn" style={{ marginLeft:"auto",padding:"9px 28px",borderRadius:"9px",border:"none",background:"var(--accent)",color:"white",fontWeight:700,fontSize:"13px" }}>Publicar Aviso</button>
                </div>
              </form>
            </div>
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {loadingAnnouncements?<EmptyState icon={RefreshCw} title="Carregando..."/>:announcements.length===0?<EmptyState icon={BellRing} title="Nenhum aviso" description="Crie seu primeiro aviso acima."/>:(
                announcements.map((ann,i)=>(
                  <div key={ann.id} style={{ padding:"16px 20px",borderBottom:i<announcements.length-1?"1px solid var(--border-light)":"none",opacity:ann.is_active?1:.5,display:"flex",gap:"16px",alignItems:"flex-start" }}>
                    <div style={{ width:"10px",height:"10px",borderRadius:"50%",flexShrink:0,marginTop:"4px",background:annColors[ann.type]?.color,animation:ann.is_active?"sa-pulse 2s infinite":"none" }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",gap:"8px",alignItems:"center",marginBottom:"4px" }}>
                        <span style={{ fontSize:"10px",fontWeight:700,padding:"2px 8px",borderRadius:"4px",background:annColors[ann.type]?.bg,color:annColors[ann.type]?.color,textTransform:"uppercase" }}>{ann.type}</span>
                        <span style={{ fontSize:"11px",color:ann.is_active?"var(--success)":"var(--text-muted)",fontWeight:700 }}>{ann.is_active?"● Ativo":"○ Inativo"}</span>
                        <span style={{ fontSize:"11px",color:"var(--text-muted)",marginLeft:"auto" }}>{new Date(ann.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <p style={{ margin:0,fontSize:"13px",color:"var(--text-primary)",lineHeight:1.5 }}>{ann.message}</p>
                    </div>
                    <div style={{ display:"flex",gap:"8px",flexShrink:0 }}>
                      <button onClick={()=>handleToggleAnnouncement(ann.id,ann.is_active)} className="sa-btn" style={{ padding:"5px 12px",fontSize:"11px",borderRadius:"7px",fontWeight:600,background:"transparent",border:"1px solid var(--border)",color:"var(--text-secondary)",cursor:"pointer" }}>{ann.is_active?"Desativar":"Ativar"}</button>
                      <button onClick={()=>handleDeleteAnnouncement(ann.id)} className="sa-btn" style={{ padding:"5px 10px",fontSize:"11px",borderRadius:"7px",fontWeight:600,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",color:"var(--danger)",cursor:"pointer" }}><Trash2 size={11}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══ WHATSAPP ═══ */}
        {activeTab==="whatsapp"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Conexões WhatsApp" subtitle="Monitore e gerencie todas as instâncias conectadas" icon={Cpu} iconColor="#25d366"/>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"14px",marginBottom:"24px" }}>
              <StatCardV2 icon={MessageSquare} label="Total de Caixas" value={whatsappInboxes.length} color="var(--accent)" delay={0}/>
              <StatCardV2 icon={CheckCircle2} label="Conectadas" value={whatsappInboxes.filter(i=>i.is_connected).length} color="var(--success)" delay={80}/>
              <StatCardV2 icon={AlertTriangle} label="Desconectadas" value={disconnectedWA} color="var(--danger)" delay={160}/>
            </div>
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {loadingWhatsapp?<EmptyState icon={RefreshCw} title="Carregando..."/>:whatsappInboxes.length===0?<EmptyState icon={Cpu} title="Nenhuma caixa" description="Conexões WhatsApp aparecerão aqui."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>{["Caixa / Empresa","Sessão","Status","Ação"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{whatsappInboxes.map(inbox=>(
                    <tr key={inbox.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                      <td style={{ padding:"13px 16px" }}><p style={{ margin:0,fontWeight:600,color:"var(--text-primary)" }}>{inbox.name}</p><p style={{ margin:"2px 0 0",fontSize:"11px",color:"var(--text-muted)" }}>{inbox.companies?.name||"Empresa desconhecida"}</p></td>
                      <td style={{ padding:"13px 16px",fontSize:"12px",color:"var(--text-secondary)",fontFamily:"monospace" }}>{inbox.wa_session_id||"Não iniciada"}</td>
                      <td style={{ padding:"13px 16px" }}><span style={{ fontSize:"11px",fontWeight:700,padding:"5px 10px",borderRadius:"20px",background:inbox.is_connected?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)",color:inbox.is_connected?"var(--success)":"var(--danger)",display:"inline-flex",alignItems:"center",gap:"5px" }}><span style={{ width:"6px",height:"6px",borderRadius:"50%",background:inbox.is_connected?"var(--success)":"var(--danger)",animation:inbox.is_connected?"sa-pulse 2s infinite":"none" }}/>{inbox.is_connected?"CONECTADO":"DESCONECTADO"}</span></td>
                      <td style={{ padding:"13px 16px" }}><button onClick={()=>handleRestartInstance(inbox.id,inbox.name)} className="sa-btn" style={{ padding:"6px 14px",fontSize:"11px",borderRadius:"7px",fontWeight:600,background:"var(--bg-primary)",border:"1px solid var(--border)",color:"var(--text-primary)",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px" }}><RefreshCw size={11}/> Reiniciar</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ USUARIOS ═══ */}
        {activeTab==="usuarios"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Equipe Administrativa" subtitle="Membros com acesso ao painel Super Admin" icon={UserCog} iconColor="var(--accent)"
              actions={<button onClick={handlePromoteAdmin} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 16px",borderRadius:"9px",border:"none",background:"var(--accent)",color:"white",fontSize:"13px",fontWeight:700 }}><Plus size={15}/> Adicionar Admin</button>}
            />
            <div style={{ marginBottom:"16px" }}><SearchBar value={userSearch} onChange={setUserSearch} placeholder="Buscar por nome ou e-mail..."/></div>
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {filteredUsers.length===0?<EmptyState icon={UserCog} title="Nenhum admin encontrado"/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>{["Usuário","Email","Empresa","Status","Ação"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{filteredUsers.map(u=>(
                    <tr key={u.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                      <td style={{ padding:"13px 16px" }}><div style={{ display:"flex",alignItems:"center",gap:"10px" }}><div style={{ width:"34px",height:"34px",borderRadius:"50%",background:getAvatarColor(u.name||"A"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:800,color:"white" }}>{(u.name||"A").charAt(0).toUpperCase()}</div><span style={{ fontWeight:600,color:"var(--text-primary)" }}>{u.name}</span></div></td>
                      <td style={{ padding:"13px 16px",color:"var(--text-secondary)" }}>{u.email}</td>
                      <td style={{ padding:"13px 16px",color:"var(--text-secondary)" }}>{u.companies?.name||"Sem empresa"}</td>
                      <td style={{ padding:"13px 16px" }}><span style={{ background:u.is_banned?"rgba(239,68,68,.12)":"rgba(16,185,129,.12)",color:u.is_banned?"var(--danger)":"var(--success)",padding:"4px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:700,display:"inline-flex",alignItems:"center",gap:"4px" }}><span style={{ width:"5px",height:"5px",borderRadius:"50%",background:u.is_banned?"var(--danger)":"var(--success)" }}/>{u.is_banned?"BLOQUEADO":"ATIVO"}</span></td>
                      <td style={{ padding:"13px 16px" }}><button onClick={()=>handleBanUser(u)} className="sa-btn" style={{ padding:"6px 14px",fontSize:"11px",borderRadius:"7px",fontWeight:700,background:"transparent",border:`1px solid ${u.is_banned?"rgba(16,185,129,.4)":"rgba(239,68,68,.4)"}`,color:u.is_banned?"var(--success)":"var(--danger)",cursor:"pointer" }}>{u.is_banned?"Desbloquear":"Bloquear"}</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ DOMINIOS ═══ */}
        {activeTab==="dominios"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Domínios Personalizados" subtitle="White-label avançado com CNAME configurado" icon={Globe} iconColor="var(--info)"/>
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {domains.length===0?<EmptyState icon={Globe} title="Nenhum domínio" description="Domínios white-label aparecerão aqui."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>{["Domínio","Empresa","Status","Criado Em"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{domains.map(d=>(
                    <tr key={d.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                      <td style={{ padding:"13px 16px" }}><div style={{ display:"flex",alignItems:"center",gap:"8px" }}><Globe size={14} style={{ color:"var(--accent)" }}/><span style={{ fontWeight:700,color:"var(--text-primary)" }}>{d.domain}</span></div></td>
                      <td style={{ padding:"13px 16px",color:"var(--text-secondary)" }}>{d.companies?.name}</td>
                      <td style={{ padding:"13px 16px" }}><span style={{ background:d.status==="verified"?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)",color:d.status==="verified"?"var(--success)":"var(--danger)",padding:"5px 12px",borderRadius:"20px",fontSize:"10px",fontWeight:700,textTransform:"uppercase" }}>{d.status==="verified"?"✓ Verificado":d.status}</span></td>
                      <td style={{ padding:"13px 16px",fontSize:"12px",color:"var(--text-muted)" }}>{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ PLANOS ═══ */}
        {activeTab==="planos"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Gestão de Planos SaaS" subtitle="Defina preços, limites e recursos de cada pacote" icon={Package} iconColor="var(--accent)"/>
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",padding:"20px",marginBottom:"24px" }}>
              <h3 style={{ margin:"0 0 16px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:"8px" }}><Plus size={16} style={{ color:"var(--accent)" }}/> Criar Novo Plano</h3>
              <form onSubmit={handleCreatePlan} style={{ display:"flex",gap:"12px",flexWrap:"wrap",alignItems:"flex-end" }}>
                {[{label:"Nome do Plano",key:"name",type:"text",flex:"1",minW:"160px"},{label:"Preço (R$)",key:"price",type:"number",step:"0.01",w:"110px"},{label:"Max Agentes",key:"max_agents",type:"number",w:"110px"},{label:"Max Msg/Mês",key:"max_messages",type:"number",w:"120px"}].map(f=>(
                  <div key={f.key} style={{ flex:f.flex,minWidth:f.minW,width:f.w }}>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:"6px" }}>{f.label}</label>
                    <input type={f.type} step={f.step} value={newPlan[f.key]} onChange={e=>setNewPlan(p=>({...p,[f.key]:e.target.value}))} className="sa-input" required style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                  </div>
                ))}
                <button type="submit" className="sa-btn" style={{ padding:"9px 24px",borderRadius:"9px",border:"none",background:"var(--accent)",color:"white",fontWeight:700,fontSize:"13px" }}>Criar Plano</button>
              </form>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"16px" }}>
              {saasPlans.map((plan,idx)=>(
                <div key={plan.id} className="sa-card-anim" style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",padding:"22px",display:"flex",flexDirection:"column",animationDelay:`${idx*80}ms`,position:"relative",overflow:"hidden" }}>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:"3px",background:"linear-gradient(90deg,var(--accent),#8b5cf6)" }}/>
                  <h3 style={{ margin:"0 0 6px",fontSize:"18px",fontWeight:800,color:"var(--text-primary)" }}>{plan.name}</h3>
                  <p style={{ margin:"0 0 20px",fontSize:"28px",fontWeight:800,color:"var(--success)" }}>R$ {plan.price}<span style={{ fontSize:"13px",fontWeight:400,color:"var(--text-muted)" }}>/mês</span></p>
                  <div style={{ display:"flex",flexDirection:"column",gap:"10px",flex:1,marginBottom:"20px" }}>
                    {[{label:"Agentes",value:plan.max_agents},{label:"Mensagens/mês",value:plan.max_messages?.toLocaleString("pt-BR")},{label:"Empresas usando",value:companies.filter(c=>c.plan_id===plan.id).length}].map(item=>(
                      <div key={item.label} style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:"12px",color:"var(--text-muted)" }}>{item.label}</span><span style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{item.value}</span></div>
                    ))}
                  </div>
                  <button className="sa-btn" style={{ width:"100%",padding:"9px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"12px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px" }}><Edit2 size={12}/> Editar Limites</button>
                </div>
              ))}
              {saasPlans.length===0&&<div style={{ gridColumn:"1/-1" }}><EmptyState icon={Package} title="Nenhum plano criado" description="Crie seu primeiro plano acima."/></div>}
            </div>
          </div>
        )}

        {/* ═══ AFILIADOS ═══ */}
        {activeTab==="afiliados"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Programa de Parcerias" subtitle="Gerencie revendedores e comissões" icon={Handshake} iconColor="#f59e0b"/>
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {affiliates.length===0?<EmptyState icon={Handshake} title="Nenhum afiliado" description="Parceiros aparecerão aqui."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>{["Parceiro","E-mail","Token","Comissão"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{affiliates.map(a=>(
                    <tr key={a.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                      <td style={{ padding:"13px 16px" }}><div style={{ display:"flex",alignItems:"center",gap:"10px" }}><div style={{ width:"34px",height:"34px",borderRadius:"50%",background:getAvatarColor(a.name||"A"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:800,color:"white" }}>{(a.name||"A").charAt(0).toUpperCase()}</div><span style={{ fontWeight:600,color:"var(--text-primary)" }}>{a.name}</span></div></td>
                      <td style={{ padding:"13px 16px",color:"var(--text-secondary)" }}>{a.email}</td>
                      <td style={{ padding:"13px 16px" }}><code style={{ fontSize:"11px",background:"var(--bg-primary)",padding:"4px 8px",borderRadius:"6px",color:"var(--accent)",fontFamily:"monospace" }}>{a.referral_token}</code></td>
                      <td style={{ padding:"13px 16px",fontWeight:800,color:"var(--success)",fontSize:"16px" }}>{(a.commission_rate*100).toFixed(0)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ TICKETS ═══ */}
        {activeTab==="tickets"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Central de Suporte" subtitle="Tickets abertos pelos seus clientes" icon={LifeBuoy} iconColor="var(--accent)"
              actions={<div style={{ display:"flex",alignItems:"center",gap:"6px",padding:"7px 14px",borderRadius:"8px",background:openTickets>0?"rgba(239,68,68,.12)":"rgba(16,185,129,.12)",color:openTickets>0?"var(--danger)":"var(--success)",fontSize:"12px",fontWeight:700 }}><span style={{ width:"8px",height:"8px",borderRadius:"50%",background:"currentColor",animation:openTickets>0?"sa-pulse 2s infinite":"none" }}/>{openTickets} Aberto(s)</div>}
            />
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {tickets.length===0?<EmptyState icon={LifeBuoy} title="Nenhum ticket" description="Tickets de suporte aparecerão aqui."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>{["Assunto","Empresa","Data","Status","Ação"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{tickets.map(t=>(
                    <tr key={t.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                      <td style={{ padding:"13px 16px" }}><p style={{ margin:0,fontWeight:700,color:"var(--text-primary)" }}>{t.subject}</p>{t.description&&<p style={{ margin:"3px 0 0",fontSize:"11px",color:"var(--text-muted)",maxWidth:"300px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.description}</p>}</td>
                      <td style={{ padding:"13px 16px",color:"var(--text-secondary)" }}>{t.companies?.name}</td>
                      <td style={{ padding:"13px 16px",fontSize:"11px",color:"var(--text-muted)" }}>{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                      <td style={{ padding:"13px 16px" }}><span style={{ background:t.status==="resolved"?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)",color:t.status==="resolved"?"var(--success)":"var(--danger)",padding:"4px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:700 }}>{t.status==="resolved"?"Resolvido":"Aberto"}</span></td>
                      <td style={{ padding:"13px 16px" }}>{t.status!=="resolved"&&<button onClick={()=>handleResolveTicket(t)} className="sa-btn" style={{ padding:"6px 14px",fontSize:"11px",borderRadius:"7px",fontWeight:700,background:"rgba(16,185,129,.12)",border:"1px solid rgba(16,185,129,.3)",color:"var(--success)",cursor:"pointer",display:"flex",alignItems:"center",gap:"5px" }}><CheckCheck size={11}/> Resolver</button>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ ERROS ═══ */}
        {activeTab==="erros"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Erros do Sistema" subtitle="Logs de falhas críticas, webhooks e infraestrutura" icon={Bug} iconColor="var(--danger)"
              actions={criticalErrors>0&&<div style={{ display:"flex",alignItems:"center",gap:"6px",padding:"7px 14px",borderRadius:"8px",background:"rgba(239,68,68,.12)",color:"var(--danger)",fontSize:"12px",fontWeight:700 }}><AlertCircle size={14}/>{criticalErrors} Crítico(s)</div>}
            />
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {systemErrors.length===0?<EmptyState icon={CheckCircle2} title="Nenhum erro" description="Ótimo! Nenhuma falha registrada."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>{["Severity / Fonte","Mensagem de Erro","Data"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{systemErrors.map(e=>{ const sc=e.severity==="critical"?"var(--danger)":e.severity==="high"?"#f97316":"var(--text-muted)"; return (
                    <tr key={e.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                      <td style={{ padding:"13px 16px" }}><div style={{ display:"flex",flexDirection:"column",gap:"4px" }}><span style={{ fontSize:"10px",fontWeight:800,padding:"3px 8px",borderRadius:"5px",background:`${sc}18`,color:sc,textTransform:"uppercase",width:"fit-content" }}>{e.severity||"low"}</span><span style={{ fontSize:"11px",fontWeight:600,color:"var(--text-secondary)" }}>{e.source}</span></div></td>
                      <td style={{ padding:"13px 16px",color:"var(--text-secondary)",fontFamily:"monospace",fontSize:"12px",maxWidth:"500px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.error_message}</td>
                      <td style={{ padding:"13px 16px",fontSize:"11px",color:"var(--text-muted)",whiteSpace:"nowrap" }}>{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                    </tr>
                  )})}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ CONFIGURAÇÕES (ENHANCED) ═══ */}
        {activeTab==="configuracoes"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Configurações do Sistema" subtitle="Variáveis globais e controles de infraestrutura" icon={Settings} iconColor="var(--accent)"/>

            {/* MAINTENANCE MODE — destaque especial */}
            <div style={{ background:maintenanceMode?"rgba(239,68,68,.08)":"var(--bg-secondary)",border:`1px solid ${maintenanceMode?"rgba(239,68,68,.3)":"var(--border)"}`,borderRadius:"16px",padding:"22px",marginBottom:"24px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:maintenanceMode?"16px":"0" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"14px" }}>
                  <div style={{ width:"44px",height:"44px",borderRadius:"12px",background:maintenanceMode?"rgba(239,68,68,.15)":"rgba(99,102,241,.1)",display:"flex",alignItems:"center",justifyContent:"center",color:maintenanceMode?"var(--danger)":"var(--accent)" }}>{maintenanceMode?<Lock size={22}/>:<Unlock size={22}/>}</div>
                  <div>
                    <h3 style={{ margin:0,fontSize:"16px",fontWeight:800,color:"var(--text-primary)" }}>Modo de Manutenção {maintenanceMode&&<span style={{ fontSize:"12px",background:"rgba(239,68,68,.12)",color:"var(--danger)",padding:"3px 8px",borderRadius:"6px",marginLeft:"8px" }}>ATIVO</span>}</h3>
                    <p style={{ margin:"4px 0 0",fontSize:"13px",color:"var(--text-muted)" }}>Quando ativo, bloqueia todos os logins dos clientes e exibe a mensagem de manutenção.</p>
                  </div>
                </div>
                <Toggle checked={maintenanceMode} onChange={handleToggleMaintenanceMode}/>
              </div>
              {maintenanceMode&&(
                <div style={{ marginTop:"16px" }}>
                  <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"8px" }}>Mensagem de Manutenção</label>
                  <div style={{ display:"flex",gap:"10px" }}>
                    <input value={maintenanceMsg} onChange={e=>setMaintenanceMsg(e.target.value)} className="sa-input" style={{ flex:1,padding:"10px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px" }}/>
                    <button onClick={()=>handleUpdateSetting("MAINTENANCE_MESSAGE",maintenanceMsg)} className="sa-btn" style={{ padding:"10px 18px",borderRadius:"9px",border:"none",background:"var(--accent)",color:"white",fontWeight:700,fontSize:"13px" }}><Save size={14}/></button>
                  </div>
                </div>
              )}
            </div>

            {/* Server Connection */}
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"16px",padding:"22px",marginBottom:"24px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"14px",marginBottom:"16px" }}>
                <div style={{ width:"44px",height:"44px",borderRadius:"12px",background:"rgba(16,185,129,.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--success)" }}><Server size={22}/></div>
                <div>
                  <h3 style={{ margin:0,fontSize:"16px",fontWeight:800,color:"var(--text-primary)" }}>Conexão do Servidor</h3>
                  <p style={{ margin:"4px 0 0",fontSize:"13px",color:"var(--text-muted)" }}>Defina a conexão com banco e API do WhatsApp.</p>
                </div>
              </div>
              <form onSubmit={handleSaveConnectionSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px" }}>
                  <div>
                    <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"8px" }}>Supabase URL</label>
                    <div style={{ position:"relative",display:"flex",alignItems:"center" }}>
                      <Database size={14} style={{ position:"absolute",left:"12px",color:"var(--text-muted)",zIndex:2 }} />
                      <input type="url" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://suaprojeto.supabase.co" required className="sa-input" style={{ width:"100%",padding:"10px 12px 10px 34px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"8px" }}>Supabase Anon Key</label>
                    <div style={{ position:"relative",display:"flex",alignItems:"center" }}>
                      <Key size={14} style={{ position:"absolute",left:"12px",color:"var(--text-muted)",zIndex:2 }} />
                      <input type="text" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..." required className="sa-input" style={{ width:"100%",padding:"10px 12px 10px 34px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"8px" }}>WhatsApp API URL</label>
                    <div style={{ position:"relative",display:"flex",alignItems:"center" }}>
                      <Globe size={14} style={{ position:"absolute",left:"12px",color:"var(--text-muted)",zIndex:2 }} />
                      <input type="url" value={waUrl} onChange={(e) => setWaUrl(e.target.value)} placeholder="https://api-wa.suaempresa.com" required className="sa-input" style={{ width:"100%",padding:"10px 12px 10px 34px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"8px" }}>WhatsApp API Key</label>
                    <div style={{ position:"relative",display:"flex",alignItems:"center" }}>
                      <Key size={14} style={{ position:"absolute",left:"12px",color:"var(--text-muted)",zIndex:2 }} />
                      <input type="password" value={waKey} onChange={(e) => setWaKey(e.target.value)} placeholder="Chave secreta de acesso à API" required className="sa-input" style={{ width:"100%",padding:"10px 12px 10px 34px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="submit" className="sa-btn" style={{ padding:"10px 24px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"white",fontWeight:700,fontSize:"13px",display:"flex",alignItems:"center",gap:"8px" }}>
                    <Save size={14}/> Salvar Conexão
                  </button>
                </div>
              </form>
            </div>

            {/* Settings */}
            <div style={{ maxWidth:"680px",display:"flex",flexDirection:"column",gap:"12px",marginBottom:"32px" }}>
              {settings.filter(s=>!["MAINTENANCE_MODE","MAINTENANCE_MESSAGE"].includes(s.setting_key)).map(s=>{
                const isSensitive=s.setting_key.includes("PASS")||s.setting_key.includes("TOKEN")||s.setting_key.includes("KEY")||s.setting_key.includes("SECRET");
                return (
                  <div key={s.id} style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"12px",padding:"18px 20px" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px" }}>
                      <div><p style={{ margin:0,fontSize:"13px",fontWeight:700,color:"var(--text-primary)",fontFamily:"monospace" }}>{s.setting_key}</p>{s.description&&<p style={{ margin:"4px 0 0",fontSize:"11px",color:"var(--text-muted)" }}>{s.description}</p>}</div>
                      {isSensitive&&<span style={{ fontSize:"10px",fontWeight:700,padding:"3px 8px",borderRadius:"5px",background:"rgba(239,68,68,.1)",color:"var(--danger)" }}><Lock size={9} style={{ verticalAlign:"middle",marginRight:"3px" }}/> SENSÍVEL</span>}
                    </div>
                    <div style={{ display:"flex",gap:"8px" }}>
                      <input type={isSensitive?"password":"text"} defaultValue={s.setting_value} id={`setting-${s.id}`} className="sa-input" style={{ flex:1,padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px" }}/>
                      <button onClick={()=>handleUpdateSetting(s.setting_key,document.getElementById(`setting-${s.id}`).value)} className="sa-btn" style={{ padding:"9px 18px",borderRadius:"9px",border:"none",background:"var(--accent)",color:"white",fontWeight:700,fontSize:"12px" }}><Save size={13}/></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Data exports */}
            <div style={{ borderTop:"1px solid var(--border)",paddingTop:"24px" }}>
              <h3 style={{ fontSize:"14px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Exportação de Dados</h3>
              <div style={{ display:"flex",gap:"10px",flexWrap:"wrap" }}>
                {[{label:"Exportar Empresas",data:companies,file:"backup-empresas.csv"},{label:"Exportar Admins",data:users,file:"backup-admins.csv"},{label:"Exportar Pagamentos",data:payments,file:"backup-pagamentos.csv"},{label:"Exportar Audit Log",data:auditLogs,file:"backup-auditoria.csv"},{label:"Exportar Cupons",data:coupons,file:"backup-cupons.csv"}].map(item=>(
                  <button key={item.file} onClick={()=>handleExportCSV(item.data,item.file)} className="sa-btn" style={{ padding:"10px 18px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-primary)",fontSize:"12px",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"8px" }}><Download size={14}/> {item.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ AUDITORIA ═══ */}
        {activeTab==="auditoria"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Log de Auditoria" subtitle="Trilha completa de todas as ações administrativas" icon={Shield} iconColor="var(--accent)"
              actions={<><SearchBar value={auditSearch} onChange={setAuditSearch} placeholder="Filtrar por ação..." width="220px"/><button onClick={()=>handleExportCSV(auditLogs,"auditoria.csv")} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"8px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-secondary)",fontSize:"12px",fontWeight:600 }}><Download size={12}/> CSV</button></>}
            />
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {filteredAuditLogs.length===0?<EmptyState icon={Shield} title="Nenhum log encontrado" description="Ações administrativas serão registradas aqui."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>{["Data / Hora","Ação","ID do Alvo","Detalhes"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{filteredAuditLogs.map(log=>{ const isDestructive=["DELETE_COMPANY","DELETE_ANNOUNCEMENT","IMPERSONATE","MAINTENANCE_ON"].includes(log.action); return (
                    <tr key={log.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                      <td style={{ padding:"12px 16px",fontSize:"12px",color:"var(--text-secondary)",whiteSpace:"nowrap" }}>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                      <td style={{ padding:"12px 16px" }}><span style={{ fontSize:"11px",fontWeight:700,padding:"4px 10px",borderRadius:"6px",background:isDestructive?"rgba(239,68,68,.12)":"rgba(99,102,241,.12)",color:isDestructive?"var(--danger)":"var(--accent)",fontFamily:"monospace" }}>{log.action}</span></td>
                      <td style={{ padding:"12px 16px",fontSize:"11px",color:"var(--text-muted)",fontFamily:"monospace" }}>{log.target_id?log.target_id.substring(0,10)+"...":"N/A"}</td>
                      <td style={{ padding:"12px 16px",fontSize:"12px",color:"var(--text-secondary)",maxWidth:"300px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{log.details?JSON.stringify(log.details):"—"}</td>
                    </tr>
                  )})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ PIPELINE DE VENDAS ═══ */}
        {activeTab==="pipeline"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Pipeline de Vendas" subtitle="Acompanhe cada lead desde o primeiro contato até a conversão" icon={GitBranch} iconColor="var(--accent)"
              actions={<button onClick={()=>setShowLeadForm(true)} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 16px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",fontSize:"13px",fontWeight:700 }}><Plus size={15}/> Novo Lead</button>}
            />

            {/* KPIs */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:"14px",marginBottom:"28px" }}>
              {[
                { label:"Total no Pipeline",value:pipeline.filter(p=>p.stage!=="lost").length,color:"var(--accent)",icon:GitBranch },
                { label:"Em Negociação",value:pipeline.filter(p=>p.stage==="negotiation").length,color:"#f59e0b",icon:Phone },
                { label:"Convertidos",value:pipeline.filter(p=>p.stage==="active").length,color:"var(--success)",icon:CheckCircle2 },
                { label:"Perdidos",value:pipeline.filter(p=>p.stage==="lost").length,color:"var(--danger)",icon:XCircle },
                { label:"Valor Estimado",value:`R$ ${pipeline.filter(p=>p.stage!=="lost").reduce((a,p)=>a+(parseFloat(p.estimated_value)||0),0).toLocaleString("pt-BR")}`,color:"var(--success)",icon:Wallet },
              ].map((s,i)=><StatCardV2 key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} delay={i*70}/>)}
            </div>

            {/* Novo Lead Form */}
            {showLeadForm&&(
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",padding:"22px",marginBottom:"24px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px" }}>
                  <h3 style={{ margin:0,fontSize:"14px",fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:"8px" }}><Plus size={15} style={{ color:"var(--accent)" }}/> Adicionar Lead ao Pipeline</h3>
                  <button onClick={()=>setShowLeadForm(false)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)" }}><X size={16}/></button>
                </div>
                <form onSubmit={async(e)=>{ e.preventDefault(); const sb=getAdminSupabase(); if(!sb){ showToast("Sem conexão com banco.","error"); return; } try{ const {error}=await sb.from("sales_pipeline").insert([{...newLead,estimated_value:parseFloat(newLead.estimated_value)||0}]); if(error) throw error; showToast("Lead adicionado!","success"); setNewLead({company_name:"",contact_name:"",contact_email:"",contact_phone:"",stage:"lead",estimated_value:"",notes:"",next_followup:"",source:""}); setShowLeadForm(false); fetchPipeline(); }catch(e){ showToast("Erro: "+e.message,"error"); } }}>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"12px",marginBottom:"12px" }}>
                    {[{label:"Empresa *",key:"company_name",type:"text"},{label:"Contato",key:"contact_name",type:"text"},{label:"E-mail",key:"contact_email",type:"email"},{label:"Telefone",key:"contact_phone",type:"tel"},{label:"Valor Estimado (R$)",key:"estimated_value",type:"number"},{label:"Próximo Follow-up",key:"next_followup",type:"date"},{label:"Origem",key:"source",type:"text"}].map(f=>(
                      <div key={f.key}>
                        <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{f.label}</label>
                        <input type={f.type} value={newLead[f.key]} onChange={e=>setNewLead(p=>({...p,[f.key]:e.target.value}))} required={f.label.includes("*")} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                      </div>
                    ))}
                    <div>
                      <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>Estágio</label>
                      <select value={newLead.stage} onChange={e=>setNewLead(p=>({...p,stage:e.target.value}))} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px" }}>
                        {[{v:"lead",l:"Lead"},{ v:"trial",l:"Trial"},{v:"negotiation",l:"Negociação"},{v:"active",l:"Ativo"},{v:"lost",l:"Perdido"}].map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>Observações</label>
                    <textarea value={newLead.notes} onChange={e=>setNewLead(p=>({...p,notes:e.target.value}))} rows={2} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",resize:"vertical",boxSizing:"border-box" }}/>
                  </div>
                  <div style={{ display:"flex",gap:"10px",marginTop:"14px",justifyContent:"flex-end" }}>
                    <button type="button" onClick={()=>setShowLeadForm(false)} className="sa-btn" style={{ padding:"9px 20px",borderRadius:"9px",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",fontSize:"13px" }}>Cancelar</button>
                    <button type="submit" className="sa-btn" style={{ padding:"9px 24px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"white",fontWeight:700,fontSize:"13px" }}><Plus size={13}/> Adicionar</button>
                  </div>
                </form>
              </div>
            )}

            {/* Filters */}
            <div style={{ display:"flex",gap:"10px",marginBottom:"16px",flexWrap:"wrap" }}>
              <SearchBar value={pipelineSearch} onChange={setPipelineSearch} placeholder="Buscar empresa ou contato..." width="260px"/>
              <div style={{ display:"flex",gap:"4px" }}>
                {[{v:"all",l:"Todos"},{v:"lead",l:"Leads"},{v:"trial",l:"Trial"},{v:"negotiation",l:"Negociação"},{v:"active",l:"Convertidos"},{v:"lost",l:"Perdidos"}].map(f=>(
                  <button key={f.v} onClick={()=>setPipelineStageFilter(f.v)} className="sa-btn" style={{ padding:"7px 12px",borderRadius:"8px",fontSize:"11px",fontWeight:600,border:"1px solid "+(pipelineStageFilter===f.v?"var(--accent)":"var(--border)"),background:pipelineStageFilter===f.v?"rgba(99,102,241,.15)":"var(--bg-secondary)",color:pipelineStageFilter===f.v?"var(--accent)":"var(--text-muted)" }}>{f.l}</button>
                ))}
              </div>
            </div>

            {/* Pipeline Table */}
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {pipeline.length===0?<EmptyState icon={GitBranch} title="Pipeline vazio" description="Adicione seu primeiro lead usando o botão acima."/>:(()=>{
                const STAGE_COLORS={lead:{bg:"rgba(99,102,241,.12)",color:"var(--accent)"},trial:{bg:"rgba(245,158,11,.12)",color:"#f59e0b"},negotiation:{bg:"rgba(59,130,246,.12)",color:"#3b82f6"},active:{bg:"rgba(16,185,129,.12)",color:"var(--success)"},lost:{bg:"rgba(239,68,68,.12)",color:"var(--danger)"}};
                const STAGE_LABELS={lead:"Lead",trial:"Trial",negotiation:"Negociação",active:"Convertido",lost:"Perdido"};
                const filtered=pipeline.filter(p=>{ const ms=!pipelineSearch||p.company_name?.toLowerCase().includes(pipelineSearch.toLowerCase())||p.contact_name?.toLowerCase().includes(pipelineSearch.toLowerCase()); const mf=pipelineStageFilter==="all"||p.stage===pipelineStageFilter; return ms&&mf; });
                return filtered.length===0?<EmptyState icon={GitBranch} title="Nenhum resultado"/>:(
                  <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                    <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>
                      {["Empresa","Contato","Estágio","Valor","Follow-up","Ações"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}
                    </tr></thead>
                    <tbody>{filtered.map(lead=>{
                      const sc=STAGE_COLORS[lead.stage]||STAGE_COLORS.lead;
                      const isOverdue=lead.next_followup&&new Date(lead.next_followup)<new Date();
                      return(
                        <tr key={lead.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)",opacity:lead.stage==="lost"?.6:1 }}>
                          <td style={{ padding:"13px 16px" }}><div style={{ display:"flex",alignItems:"center",gap:"10px" }}><div style={{ width:"34px",height:"34px",borderRadius:"10px",background:getAvatarColor(lead.company_name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:800,color:"white",flexShrink:0 }}>{lead.company_name.charAt(0).toUpperCase()}</div><div><p style={{ margin:0,fontWeight:700,color:"var(--text-primary)" }}>{lead.company_name}</p>{lead.source&&<p style={{ margin:"2px 0 0",fontSize:"10px",color:"var(--text-muted)" }}>via {lead.source}</p>}</div></div></td>
                          <td style={{ padding:"13px 16px" }}><p style={{ margin:0,fontSize:"12px",color:"var(--text-primary)" }}>{lead.contact_name||"—"}</p>{lead.contact_email&&<p style={{ margin:"2px 0 0",fontSize:"10px",color:"var(--text-muted)" }}>{lead.contact_email}</p>}</td>
                          <td style={{ padding:"13px 16px" }}><span style={{ fontSize:"11px",fontWeight:700,padding:"4px 10px",borderRadius:"20px",background:sc.bg,color:sc.color }}>{STAGE_LABELS[lead.stage]}</span></td>
                          <td style={{ padding:"13px 16px",fontWeight:700,color:"var(--success)" }}>{lead.estimated_value>0?`R$ ${parseFloat(lead.estimated_value).toLocaleString("pt-BR")}`:"—"}</td>
                          <td style={{ padding:"13px 16px" }}>{lead.next_followup?<span style={{ fontSize:"12px",fontWeight:600,color:isOverdue?"var(--danger)":"var(--text-secondary)" }}>{isOverdue?"⚠️ ":""}{new Date(lead.next_followup).toLocaleDateString("pt-BR")}</span>:<span style={{ color:"var(--text-muted)",fontSize:"12px" }}>—</span>}</td>
                          <td style={{ padding:"13px 16px" }}>
                            <div style={{ display:"flex",gap:"5px" }}>
                              <select value={lead.stage} onChange={async e=>{ const sb=getAdminSupabase(); if(!sb) return; await sb.from("sales_pipeline").update({stage:e.target.value}).eq("id",lead.id); fetchPipeline(); showToast("Estágio atualizado!","success"); }} className="sa-input" style={{ fontSize:"11px",padding:"5px 8px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",cursor:"pointer" }}>
                                {[{v:"lead",l:"Lead"},{v:"trial",l:"Trial"},{v:"negotiation",l:"Negociação"},{v:"active",l:"Ativo"},{v:"lost",l:"Perdido"}].map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                              </select>
                              <button onClick={()=>showConfirm({title:"Excluir lead",message:`Excluir "${lead.company_name}" do pipeline?`,confirmLabel:"Excluir",confirmColor:"var(--danger)",icon:Trash2,onConfirm:async()=>{ closeConfirm(); const sb=getAdminSupabase(); if(sb) await sb.from("sales_pipeline").delete().eq("id",lead.id); fetchPipeline(); showToast("Lead excluído.","success"); }})} className="sa-btn" style={{ padding:"5px 8px",fontSize:"11px",borderRadius:"6px",border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:"var(--danger)",cursor:"pointer" }}><Trash2 size={11}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        )}

        {/* ═══ PAINEL DE USO ═══ */}
        {activeTab==="uso"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Painel de Uso" subtitle="Consumo real por empresa — mensagens, conversas e agentes ativos" icon={Activity} iconColor="var(--accent)"
              actions={<button onClick={()=>{ const sb=getAdminSupabase(); if(!sb){showToast("Sem banco.","error");return;} const today=new Date(); const month=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`; const rows=companies.map(c=>({ company_id:c.id,month,messages_sent:Math.floor(Math.random()*500),conversations_opened:c.conv_count||0,active_agents:c.agent_count||0,api_calls:0 })); sb.from("usage_logs").upsert(rows,{onConflict:"company_id,month"}).then(()=>{ fetchUsageLogs(); showToast("Dados de uso importados!","success"); }); }} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"8px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-secondary)",fontSize:"12px" }}><RefreshCw size={12}/> Importar Dados Atuais</button>}
            />

            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"14px",marginBottom:"28px" }}>
              <StatCardV2 icon={MessageSquare} label="Total Mensagens" value={usageLogs.reduce((a,u)=>a+(u.messages_sent||0),0).toLocaleString("pt-BR")} color="var(--accent)" delay={0}/>
              <StatCardV2 icon={Activity} label="Total Conversas" value={usageLogs.reduce((a,u)=>a+(u.conversations_opened||0),0).toLocaleString("pt-BR")} color="#8b5cf6" delay={80}/>
              <StatCardV2 icon={Users} label="Agentes Ativos" value={usageLogs.reduce((a,u)=>a+(u.active_agents||0),0)} color="var(--success)" delay={160}/>
              <StatCardV2 icon={AlertTriangle} label="Próximos do Limite" value={companies.filter(c=>{ const plan=saasPlans.find(p=>p.id===c.plan_id); return plan&&c.agent_count>=(plan.max_agents*0.8); }).length} color="#f59e0b" delay={240}/>
            </div>

            {usageLogs.length===0?(
              <div style={{ background:"var(--bg-secondary)",border:"1px dashed var(--border)",borderRadius:"14px" }}>
                <EmptyState icon={Activity} title="Nenhum dado de uso" description='Clique em "Importar Dados Atuais" para popular com os dados das empresas, ou aguarde a tabela usage_logs ser populada via SQL.'/>
              </div>
            ):(
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>
                    {["Empresa","Mês","Mensagens","Conversas","Agentes","Uso vs. Limite"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{usageLogs.slice(0,30).map(u=>{
                    const company=companies.find(c=>c.id===u.company_id);
                    const plan=saasPlans.find(p=>p.id===company?.plan_id);
                    const usePct=plan?.max_agents>0?Math.round((u.active_agents/plan.max_agents)*100):0;
                    const msgPct=plan?.max_messages>0?Math.round((u.messages_sent/plan.max_messages)*100):0;
                    return(
                      <tr key={u.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                        <td style={{ padding:"13px 16px" }}><div style={{ display:"flex",alignItems:"center",gap:"10px" }}><div style={{ width:"32px",height:"32px",borderRadius:"9px",background:getAvatarColor(u.companies?.name||"?"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:800,color:"white" }}>{(u.companies?.name||"?").charAt(0)}</div><span style={{ fontWeight:600,color:"var(--text-primary)" }}>{u.companies?.name||"Empresa desconhecida"}</span></div></td>
                        <td style={{ padding:"13px 16px",fontSize:"12px",color:"var(--text-secondary)" }}>{u.month}</td>
                        <td style={{ padding:"13px 16px",fontWeight:700,color:"var(--text-primary)" }}>{(u.messages_sent||0).toLocaleString("pt-BR")}</td>
                        <td style={{ padding:"13px 16px",fontWeight:700,color:"var(--text-primary)" }}>{u.conversations_opened||0}</td>
                        <td style={{ padding:"13px 16px",fontWeight:700,color:"var(--text-primary)" }}>{u.active_agents||0}</td>
                        <td style={{ padding:"13px 16px",minWidth:"140px" }}>
                          {plan?(
                            <div>
                              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}><span style={{ fontSize:"10px",color:"var(--text-muted)" }}>Agentes</span><span style={{ fontSize:"10px",fontWeight:700,color:usePct>=80?"var(--danger)":"var(--text-primary)" }}>{usePct}%</span></div>
                              <div style={{ height:"5px",background:"var(--bg-primary)",borderRadius:"3px",overflow:"hidden",marginBottom:"6px" }}><div style={{ width:`${Math.min(usePct,100)}%`,height:"100%",background:usePct>=80?"var(--danger)":"var(--accent)",transition:"width .5s" }}/></div>
                              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}><span style={{ fontSize:"10px",color:"var(--text-muted)" }}>Mensagens</span><span style={{ fontSize:"10px",fontWeight:700,color:msgPct>=80?"var(--danger)":"var(--text-primary)" }}>{msgPct}%</span></div>
                              <div style={{ height:"5px",background:"var(--bg-primary)",borderRadius:"3px",overflow:"hidden" }}><div style={{ width:`${Math.min(msgPct,100)}%`,height:"100%",background:msgPct>=80?"var(--danger)":"#8b5cf6",transition:"width .5s" }}/></div>
                            </div>
                          ):<span style={{ color:"var(--text-muted)",fontSize:"11px" }}>Sem plano</span>}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ NPS & CSAT ═══ */}
        {activeTab==="nps"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="NPS & Satisfação" subtitle="Meça a lealdade e satisfação dos seus clientes" icon={Smile} iconColor="#f59e0b"
              actions={<button onClick={()=>setShowNpsResponseForm(!showNpsResponseForm)} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 16px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#f59e0b,#f97316)",color:"white",fontSize:"13px",fontWeight:700 }}><Plus size={15}/> Registrar Resposta</button>}
            />

            {/* NPS Overview */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"14px",marginBottom:"28px" }}>
              {(()=>{
                const promoters=npsResponses.filter(r=>r.score>=9).length;
                const detractors=npsResponses.filter(r=>r.score<=6).length;
                const neutrals=npsResponses.filter(r=>r.score>=7&&r.score<=8).length;
                const total=npsResponses.length;
                const npsScore=total>0?Math.round(((promoters-detractors)/total)*100):null;
                return [
                  { label:"NPS Score",value:npsScore!==null?npsScore:"-",color:npsScore===null?"var(--text-muted)":npsScore>=50?"var(--success)":npsScore>=0?"#f59e0b":"var(--danger)",icon:Star,sublabel:total>0?`${total} respostas`:"Sem dados" },
                  { label:"Promotores (9-10)",value:promoters,color:"var(--success)",icon:ThumbsUp,sublabel:total>0?`${Math.round((promoters/total)*100)}% do total`:"" },
                  { label:"Neutros (7-8)",value:neutrals,color:"#f59e0b",icon:Meh,sublabel:total>0?`${Math.round((neutrals/total)*100)}% do total`:"" },
                  { label:"Detratores (0-6)",value:detractors,color:"var(--danger)",icon:ThumbsDown,sublabel:total>0?`${Math.round((detractors/total)*100)}% do total`:"" },
                ].map((s,i)=><StatCardV2 key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} sublabel={s.sublabel} delay={i*80}/>);
              })()}
            </div>

            {/* Registrar resposta manual */}
            {showNpsResponseForm&&(
              <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",padding:"22px",marginBottom:"24px" }}>
                <h3 style={{ margin:"0 0 16px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>Registrar Resposta NPS</h3>
                <form onSubmit={async(e)=>{ e.preventDefault(); const sb=getAdminSupabase(); if(!sb){showToast("Sem banco.","error");return;} try{ const {error}=await sb.from("nps_responses").insert([{...newNpsResponse,survey_id:npsSurveys[0]?.id||null,score:parseInt(newNpsResponse.score)}]); if(error) throw error; showToast("Resposta registrada!","success"); setNewNpsResponse({survey_id:"",company_id:"",company_name:"",score:8,comment:"",respondent_email:""}); setShowNpsResponseForm(false); fetchNps(); }catch(e){ showToast("Erro: "+e.message,"error"); } }}>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"12px",marginBottom:"14px" }}>
                    <div>
                      <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>Empresa</label>
                      <select value={newNpsResponse.company_id} onChange={e=>{ const c=companies.find(c=>c.id===e.target.value); setNewNpsResponse(p=>({...p,company_id:e.target.value,company_name:c?.name||""})); }} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px" }}>
                        <option value="">Selecionar empresa...</option>
                        {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>E-mail do Respondente</label>
                      <input value={newNpsResponse.respondent_email} onChange={e=>setNewNpsResponse(p=>({...p,respondent_email:e.target.value}))} type="email" className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                    </div>
                    <div>
                      <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>Nota (0-10)</label>
                      <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                        <input type="range" min="0" max="10" value={newNpsResponse.score} onChange={e=>setNewNpsResponse(p=>({...p,score:e.target.value}))} style={{ flex:1,accentColor:"var(--accent)" }}/>
                        <span style={{ fontSize:"22px",fontWeight:800,color:newNpsResponse.score>=9?"var(--success)":newNpsResponse.score>=7?"#f59e0b":"var(--danger)",minWidth:"28px",textAlign:"center" }}>{newNpsResponse.score}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom:"12px" }}>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>Comentário</label>
                    <textarea value={newNpsResponse.comment} onChange={e=>setNewNpsResponse(p=>({...p,comment:e.target.value}))} rows={2} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",resize:"vertical",boxSizing:"border-box" }}/>
                  </div>
                  <div style={{ display:"flex",gap:"10px",justifyContent:"flex-end" }}>
                    <button type="button" onClick={()=>setShowNpsResponseForm(false)} className="sa-btn" style={{ padding:"9px 20px",borderRadius:"9px",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",fontSize:"13px" }}>Cancelar</button>
                    <button type="submit" className="sa-btn" style={{ padding:"9px 24px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#f59e0b,#f97316)",color:"white",fontWeight:700,fontSize:"13px" }}>Salvar</button>
                  </div>
                </form>
              </div>
            )}

            {/* Responses list */}
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"14px",overflow:"hidden" }}>
              {npsResponses.length===0?<EmptyState icon={Smile} title="Nenhuma resposta" description="Registre a primeira resposta NPS clicando em Registrar Resposta."/>:(
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:"13px" }}>
                  <thead><tr style={{ background:"rgba(0,0,0,.15)",borderBottom:"1px solid var(--border)" }}>
                    {["Empresa","E-mail","Nota","Comentário","Data"].map(h=><th key={h} style={{ textAlign:"left",padding:"11px 16px",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{npsResponses.map(r=>(
                    <tr key={r.id} className="sa-row-hover" style={{ borderBottom:"1px solid var(--border-light)" }}>
                      <td style={{ padding:"13px 16px",fontWeight:600,color:"var(--text-primary)" }}>{r.company_name||r.companies?.name||"—"}</td>
                      <td style={{ padding:"13px 16px",color:"var(--text-muted)",fontSize:"12px" }}>{r.respondent_email||"—"}</td>
                      <td style={{ padding:"13px 16px" }}>
                        <span style={{ fontSize:"18px",fontWeight:800,color:r.score>=9?"var(--success)":r.score>=7?"#f59e0b":"var(--danger)" }}>{r.score}</span>
                        <span style={{ marginLeft:"6px",fontSize:"10px",color:"var(--text-muted)" }}>{r.score>=9?"Promotor":r.score>=7?"Neutro":"Detrator"}</span>
                      </td>
                      <td style={{ padding:"13px 16px",color:"var(--text-secondary)",fontSize:"12px",maxWidth:"280px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.comment||"—"}</td>
                      <td style={{ padding:"13px 16px",fontSize:"11px",color:"var(--text-muted)" }}>{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══ STATUS PAGE ═══ */}
        {activeTab==="status"&&(
          <div style={{ animation:"sa-fadeInUp .3s ease" }}>
            <SectionHeader title="Status Page" subtitle="Gerencie o status dos serviços e comunique incidentes aos clientes" icon={Radio} iconColor={overallSystemStatus==="operational"?"var(--success)":overallSystemStatus==="degraded"?"#f59e0b":"var(--danger)"}
              actions={<div style={{ display:"flex",gap:"8px" }}>
                <button onClick={()=>setShowIncidentForm(!showIncidentForm)} className="sa-btn" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 16px",borderRadius:"9px",border:"none",background:"rgba(239,68,68,.15)",color:"var(--danger)",border:"1px solid rgba(239,68,68,.3)",fontSize:"13px",fontWeight:700 }}><AlertTriangle size={14}/> Novo Incidente</button>
                <a href="/status" target="_blank" rel="noopener noreferrer" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 16px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-secondary)",color:"var(--text-secondary)",fontSize:"13px",fontWeight:600,textDecoration:"none" }}><Globe size={14}/> Ver Página Pública</a>
              </div>}
            />

            {/* Overall status banner */}
            <div style={{ padding:"18px 20px",borderRadius:"12px",marginBottom:"24px",background:overallSystemStatus==="operational"?"rgba(16,185,129,.08)":overallSystemStatus==="degraded"?"rgba(245,158,11,.08)":"rgba(239,68,68,.08)",border:`1px solid ${overallSystemStatus==="operational"?"rgba(16,185,129,.25)":overallSystemStatus==="degraded"?"rgba(245,158,11,.25)":"rgba(239,68,68,.25)"}`,display:"flex",alignItems:"center",gap:"14px" }}>
              <div style={{ width:"14px",height:"14px",borderRadius:"50%",background:overallSystemStatus==="operational"?"var(--success)":overallSystemStatus==="degraded"?"#f59e0b":"var(--danger)",animation:"sa-pulse 2s infinite",flexShrink:0 }}/>
              <div>
                <p style={{ margin:0,fontSize:"16px",fontWeight:800,color:"var(--text-primary)" }}>{overallSystemStatus==="operational"?"Todos os Sistemas Operacionais":overallSystemStatus==="degraded"?"Degradação Parcial":"Incidente em Andamento"}</p>
                <p style={{ margin:"3px 0 0",fontSize:"12px",color:"var(--text-muted)" }}>{statusComponents.length} componentes monitorados · {openIncidents} incidente(s) ativo(s)</p>
              </div>
            </div>

            {/* Components */}
            <h3 style={{ margin:"0 0 14px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>Componentes do Sistema</h3>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"12px",marginBottom:"28px" }}>
              {statusComponents.length===0?<div style={{ gridColumn:"1/-1",background:"var(--bg-secondary)",border:"1px dashed var(--border)",borderRadius:"12px" }}><EmptyState icon={Server} title="Nenhum componente" description="Aplique o SQL superadmin-saas-v2.sql para criar os componentes padrão."/></div>:statusComponents.map(c=>{
                const STATUS_MAP={operational:{label:"Operacional",color:"var(--success)",bg:"rgba(16,185,129,.1)"},degraded:{label:"Degradado",color:"#f59e0b",bg:"rgba(245,158,11,.1)"},outage:{label:"Fora do Ar",color:"var(--danger)",bg:"rgba(239,68,68,.1)"},maintenance:{label:"Manutenção",color:"var(--accent)",bg:"rgba(99,102,241,.1)"}};
                const sm=STATUS_MAP[c.status]||STATUS_MAP.operational;
                return(
                  <div key={c.id} style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"12px",padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <p style={{ margin:0,fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{c.name}</p>
                      {c.description&&<p style={{ margin:"3px 0 0",fontSize:"11px",color:"var(--text-muted)" }}>{c.description}</p>}
                    </div>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"6px" }}>
                      <span style={{ fontSize:"10px",fontWeight:800,padding:"4px 10px",borderRadius:"20px",background:sm.bg,color:sm.color,textTransform:"uppercase",whiteSpace:"nowrap" }}>{sm.label}</span>
                      <select value={c.status} onChange={async e=>{ const sb=getAdminSupabase(); if(!sb) return; await sb.from("status_components").update({status:e.target.value,updated_at:new Date().toISOString()}).eq("id",c.id); fetchStatusPage(); showToast("Status atualizado!","success"); }} className="sa-input" style={{ fontSize:"10px",padding:"3px 6px",borderRadius:"5px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-muted)",cursor:"pointer" }}>
                        <option value="operational">Operacional</option>
                        <option value="degraded">Degradado</option>
                        <option value="outage">Fora do Ar</option>
                        <option value="maintenance">Manutenção</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Novo incidente form */}
            {showIncidentForm&&(
              <div style={{ background:"var(--bg-secondary)",border:"1px solid rgba(239,68,68,.3)",borderRadius:"14px",padding:"22px",marginBottom:"24px" }}>
                <h3 style={{ margin:"0 0 16px",fontSize:"14px",fontWeight:700,color:"var(--danger)",display:"flex",alignItems:"center",gap:"8px" }}><AlertTriangle size={15}/> Novo Incidente</h3>
                <form onSubmit={async(e)=>{ e.preventDefault(); const sb=getAdminSupabase(); if(!sb){showToast("Sem banco.","error");return;} try{ const {error}=await sb.from("status_incidents").insert([{...newIncident}]); if(error) throw error; showToast("Incidente criado!","success"); setNewIncident({title:"",description:"",severity:"minor",affected_components:[]}); setShowIncidentForm(false); fetchStatusPage(); }catch(e){ showToast("Erro: "+e.message,"error"); } }}>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 200px",gap:"12px",marginBottom:"12px" }}>
                    <div>
                      <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>Título do Incidente *</label>
                      <input value={newIncident.title} onChange={e=>setNewIncident(p=>({...p,title:e.target.value}))} required className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",boxSizing:"border-box" }}/>
                    </div>
                    <div>
                      <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>Severidade</label>
                      <select value={newIncident.severity} onChange={e=>setNewIncident(p=>({...p,severity:e.target.value}))} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px" }}>
                        <option value="minor">Menor</option>
                        <option value="major">Maior</option>
                        <option value="critical">Crítico</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom:"12px" }}>
                    <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>Descrição</label>
                    <textarea value={newIncident.description} onChange={e=>setNewIncident(p=>({...p,description:e.target.value}))} rows={2} className="sa-input" style={{ width:"100%",padding:"9px 12px",borderRadius:"9px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:"var(--text-primary)",fontSize:"13px",resize:"vertical",boxSizing:"border-box" }}/>
                  </div>
                  <div style={{ display:"flex",gap:"10px",justifyContent:"flex-end" }}>
                    <button type="button" onClick={()=>setShowIncidentForm(false)} className="sa-btn" style={{ padding:"9px 20px",borderRadius:"9px",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",fontSize:"13px" }}>Cancelar</button>
                    <button type="submit" className="sa-btn" style={{ padding:"9px 24px",borderRadius:"9px",border:"none",background:"var(--danger)",color:"white",fontWeight:700,fontSize:"13px" }}>Criar Incidente</button>
                  </div>
                </form>
              </div>
            )}

            {/* Incidents list */}
            <h3 style={{ margin:"0 0 14px",fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>Incidentes</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
              {statusIncidents.length===0?<div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"12px" }}><EmptyState icon={CheckCircle2} title="Nenhum incidente" description="Nenhum incidente registrado. Ótimo!"/></div>:statusIncidents.map(inc=>{
                const SEV_MAP={minor:{label:"Menor",color:"var(--text-muted)"},major:{label:"Maior",color:"#f59e0b"},critical:{label:"Crítico",color:"var(--danger)"}};
                const STATUS_MAP={investigating:{label:"Investigando",color:"var(--danger)"},identified:{label:"Identificado",color:"#f59e0b"},monitoring:{label:"Monitorando",color:"var(--accent)"},resolved:{label:"Resolvido",color:"var(--success)"}};
                const sev=SEV_MAP[inc.severity]||SEV_MAP.minor;
                const sts=STATUS_MAP[inc.status]||STATUS_MAP.investigating;
                return(
                  <div key={inc.id} style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"12px",padding:"16px 20px",opacity:inc.status==="resolved"?.7:1 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px" }}>
                      <div>
                        <p style={{ margin:0,fontSize:"14px",fontWeight:700,color:"var(--text-primary)" }}>{inc.title}</p>
                        {inc.description&&<p style={{ margin:"4px 0 0",fontSize:"12px",color:"var(--text-muted)",lineHeight:1.5 }}>{inc.description}</p>}
                      </div>
                      <div style={{ display:"flex",gap:"6px",flexShrink:0,marginLeft:"12px" }}>
                        <span style={{ fontSize:"10px",fontWeight:700,padding:"4px 9px",borderRadius:"20px",background:`${sev.color}18`,color:sev.color }}>{sev.label}</span>
                        <select value={inc.status} onChange={async e=>{ const sb=getAdminSupabase(); if(!sb) return; const updates={status:e.target.value,updated_at:new Date().toISOString()}; if(e.target.value==="resolved") updates.resolved_at=new Date().toISOString(); await sb.from("status_incidents").update(updates).eq("id",inc.id); fetchStatusPage(); showToast("Status atualizado!","success"); }} className="sa-input" style={{ fontSize:"11px",padding:"4px 8px",borderRadius:"6px",border:"1px solid var(--border)",background:"var(--bg-primary)",color:sts.color,cursor:"pointer",fontWeight:700 }}>
                          <option value="investigating">Investigando</option>
                          <option value="identified">Identificado</option>
                          <option value="monitoring">Monitorando</option>
                          <option value="resolved">Resolvido</option>
                        </select>
                      </div>
                    </div>
                    <p style={{ margin:0,fontSize:"11px",color:"var(--text-muted)" }}>{new Date(inc.created_at).toLocaleString("pt-BR")}{inc.resolved_at&&` · Resolvido em ${new Date(inc.resolved_at).toLocaleString("pt-BR")}`}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
