import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { users as usersApi } from '../lib/api.js';
import toast from 'react-hot-toast';
import './AdminMembers.css';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminMembers() {
  const { t } = useTranslation();
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [toggling, setToggling] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await usersApi.list({ role: 'member' });
      setMembers(Array.isArray(d) ? d : d?.users || []);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(member) {
    setToggling(t => ({ ...t, [member.id]: true }));
    try {
      const isActive = member.is_active !== false;
      await usersApi.update(member.id, { is_active: !isActive });
      setMembers(ms => ms.map(m =>
        m.id === member.id ? { ...m, is_active: !isActive } : m
      ));
      toast.success(isActive ? t('admin.deactivateBtn') : t('admin.activateBtn'));
    } catch {
      toast.error(t('errors.unknownError'));
    } finally {
      setToggling(tt => ({ ...tt, [member.id]: false }));
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
                    <th>{t('admin.memberEmail')}</th>
                    <th>{t('admin.memberPhone')}</th>
                    <th>{t('admin.memberSince')}</th>
                    <th>{t('admin.activeLoans')}</th>
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
                            <div className="member-avatar-sm">{initials(member.full_name)}</div>
                            <span>{member.full_name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="member-id-chip">{member.membership_id || '—'}</span>
                        </td>
                        <td>{member.email}</td>
                        <td>{member.phone || '—'}</td>
                        <td>{fmt(member.created_at)}</td>
                        <td>
                          <span className="member-loan-count">
                            {member.active_loans_count ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isActive ? 'badge-available' : 'badge-locked'}`}>
                            {isActive ? t('admin.active') : t('admin.inactive')}
                          </span>
                        </td>
                        <td>
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
    </div>
  );
}
