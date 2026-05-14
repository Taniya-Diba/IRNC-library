import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { users as usersApi } from '../lib/api.js';
import { getCategoryColors } from '../lib/categoryColors.js';
import Modal from '../components/ui/Modal.jsx';
import toast from 'react-hot-toast';
import './AdminMembers.css';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminMembers() {
  const { t } = useTranslation();
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [toggling, setToggling] = useState({});

  // Loan history modal
  const [loanModalOpen, setLoanModalOpen]   = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberLoans, setMemberLoans]       = useState([]);
  const [loadingLoans, setLoadingLoans]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await usersApi.list({ role: 'member' });
      setMembers(Array.isArray(d) ? d : d?.data || d?.users || []);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  async function handleViewLoans(member) {
    setSelectedMember(member);
    setMemberLoans([]);
    setLoanModalOpen(true);
    setLoadingLoans(true);
    try {
      const data = await usersApi.getLoans(member.id);
      setMemberLoans(Array.isArray(data) ? data : data?.loans || []);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setLoadingLoans(false);
    }
  }

  async function handleToggle(member) {
    const isActive = member.is_active !== false;
    if (isActive && !window.confirm(t('admin.deactivateConfirm'))) return;

    setToggling(prev => ({ ...prev, [member.id]: true }));
    try {
      if (isActive) {
        await usersApi.deactivate(member.id);
      } else {
        await usersApi.activate(member.id);
      }
      setMembers(ms => ms.map(m =>
        m.id === member.id ? { ...m, is_active: !isActive } : m
      ));
      toast.success(isActive ? t('admin.deactivateBtn') : t('admin.activateBtn'));
    } catch {
      toast.error(t('errors.unknownError'));
    } finally {
      setToggling(prev => ({ ...prev, [member.id]: false }));
    }
  }

  const filtered = members.filter(m =>
    !search ||
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.membership_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="container">
        <div className="admin-page-header">
          <h1>{t('admin.membersPage')}</h1>
          <span className="members-total-count">
            {members.length} {t('admin.totalMembers').toLowerCase()}
          </span>
        </div>

        <div className="glass admin-search-bar">
          <input
            className="form-input admin-search-input"
            placeholder={t('admin.searchMembers')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>{t('common.noResults')}</p>
          </div>
        ) : (
          <div className="glass members-table-wrap">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.memberName')}</th>
                    <th>{t('admin.colMemberId')}</th>
                    <th className="col-hide-mobile">{t('admin.memberEmail')}</th>
                    <th className="col-hide-mobile">{t('admin.memberPhone')}</th>
                    <th>{t('admin.memberStatus')}</th>
                    <th>{t('admin.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(member => {
                    const isActive = member.is_active !== false;
                    return (
                      <tr key={member.id}>
                        <td>
                          <div className="member-name-cell">
                            <div
                              className="member-avatar-sm"
                              style={{
                                background: isActive
                                  ? 'linear-gradient(135deg, #6C47FF, #A78BFA)'
                                  : 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
                              }}
                            >
                              {initials(member.full_name)}
                            </div>
                            <span>{member.full_name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="member-id-chip">{member.membership_id || '—'}</span>
                        </td>
                        <td className="col-hide-mobile">{member.email}</td>
                        <td className="col-hide-mobile">{member.phone || '—'}</td>
                        <td>
                          <span className={`badge ${isActive ? 'badge-available' : 'badge-locked'}`}>
                            {isActive ? t('admin.active') : t('admin.inactive')}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleViewLoans(member)}
                            >
                              {t('admin.viewLoans')}
                            </button>
                            <button
                              className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-secondary'}`}
                              disabled={toggling[member.id]}
                              onClick={() => handleToggle(member)}
                            >
                              {toggling[member.id]
                                ? <span className="spinner" />
                                : isActive ? t('admin.deactivateBtn') : t('admin.activateBtn')
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Loan history modal */}
      <Modal
        open={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        title={selectedMember ? `${selectedMember.full_name} — ${t('admin.loanHistory')}` : ''}
        maxWidth={680}
      >
        {loadingLoans ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        ) : memberLoans.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="empty-state-icon">📚</div>
            <p>{t('admin.noLoans')}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.colTitle')}</th>
                  <th>{t('admin.colCheckedOut')}</th>
                  <th>{t('admin.colDue')}</th>
                  <th>{t('admin.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {memberLoans.map(loan => {
                  const colors = getCategoryColors(loan.book?.category);
                  return (
                    <tr key={loan.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: colors.from,
                              flexShrink: 0,
                              display: 'inline-block',
                            }}
                          />
                          {loan.book?.title || '—'}
                        </div>
                      </td>
                      <td>{fmt(loan.checkout_date || loan.created_at)}</td>
                      <td>{fmt(loan.due_date)}</td>
                      <td>
                        <span className={`badge badge-${loan.status}`}>
                          {t(`status.${loan.status}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
