import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  Contact, 
  UserPlus, 
  Mail, 
  Phone, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Target, 
  DollarSign,
  Building2
} from 'lucide-react';
import { RetentionHeader } from './RetentionHeader';
import { TeamMemberModal } from './TeamMemberModal';
import { retentionService } from '../../services/retentionService';
import { TeamSpecialist, RetentionCustomer } from '../../types/retention';

export const TeamMembers: React.FC = () => {
  const [specialists, setSpecialists] = useState<TeamSpecialist[]>([]);
  const [customers, setCustomers] = useState<RetentionCustomer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState<TeamSpecialist | null>(null);

  const loadData = () => {
    setSpecialists(retentionService.getSpecialists());
    setCustomers(retentionService.getCustomers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCustomers = customers.filter(c => c.health !== 'Churned');

  const handleEdit = (spec: TeamSpecialist) => {
    setEditingSpecialist(spec);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSpecialist(null);
    setIsModalOpen(true);
  };

  const handleDelete = (spec: TeamSpecialist) => {
    const assigned = activeCustomers.filter(c => c.assigned_to_id === spec.id || c.assigned_to === spec.name);
    if (assigned.length > 0) {
      alert(`Cannot delete ${spec.name}. They currently have ${assigned.length} assigned customers. Please reassign their accounts first.`);
      return;
    }

    if (confirm(`Are you sure you want to remove team member ${spec.name}?`)) {
      retentionService.deleteSpecialist(spec.id);
      loadData();
    }
  };

  return <ModuleWorkspace id="TeamMembers" number="19" title="Your success team" description="People, capacity and ownership. Keep your team working in balance." category="Customer success" kind="directory" links={[{ label: 'Portfolio planner', path: '/retention/assignment' }]}><div className="v2-page-content"><RetentionHeader />
    <div className="team-directory-toolbar"><div><h2>People & capacity</h2><span>{specialists.length} specialists · {activeCustomers.length} active accounts</span></div><button className="v2-button v2-primary" onClick={handleCreate}><UserPlus size={14} />Add Team Member</button></div>
    <div className="team-directory">{specialists.map((spec, index) => {
      const assigned = activeCustomers.filter(c => c.assigned_to_id === spec.id || c.assigned_to === spec.name);
      const count = assigned.length; const quota = spec.quota_capacity || 10; const utilization = Math.round(count / quota * 100); const mrr = assigned.reduce((sum, c) => sum + c.mrr, 0);
      return <article className="team-directory-member" key={spec.id}><div className="team-member-identity"><span className="team-member-index">{String(index + 1).padStart(2, '0')}</span><span className="team-member-avatar" style={{ background: spec.avatar_color }}>{spec.name.slice(0, 1)}</span><div><h3>{spec.name}</h3><p>{spec.role}</p><span className={`team-status ${spec.status === 'Active' ? 'active' : ''}`}>{spec.status}</span></div><div className="team-member-actions"><button aria-label={`Edit ${spec.name}`} title="Edit Member" onClick={() => handleEdit(spec)}><Edit2 size={13} /></button><button aria-label={`Remove ${spec.name}`} title="Remove Member" onClick={() => handleDelete(spec)}><Trash2 size={13} /></button></div></div>
      <div className="team-member-body"><div className="team-member-contact"><span><Mail size={12} />{spec.email || 'No email provided'}</span><span><Phone size={12} />{spec.phone || 'No phone provided'}</span><span><Calendar size={12} />Joined {spec.joined_date}</span></div><div className="team-member-capacity"><div><span>Portfolio capacity</span><strong>{count} <small>/ {quota}</small></strong></div><div className="team-capacity-track"><span style={{ width: `${Math.min(100, utilization)}%`, background: utilization > 100 ? '#c97687' : utilization >= 80 ? '#c5a15f' : '#258f80' }} /></div><span>{utilization}% utilized</span></div><div className="team-member-revenue"><span>MONTHLY PORTFOLIO</span><strong>৳{mrr.toLocaleString()}</strong><small>BDT / month</small></div></div>
      <div className="team-member-accounts"><span>KEY ACCOUNTS <strong>{count}</strong></span><div>{assigned.length ? assigned.slice(0, 4).map(customer => <span key={customer.id} title={customer.name}>{customer.name}</span>) : <small>No active accounts assigned yet.</small>}{assigned.length > 4 && <span>+{assigned.length - 4} more</span>}</div></div></article>;
    })}</div>
    <TeamMemberModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSpecialist(null); }} onSuccess={loadData} specialistToEdit={editingSpecialist} />
  </div></ModuleWorkspace>;
};

