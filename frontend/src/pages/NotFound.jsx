import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './NotFound.css';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="page-content not-found-page">
      <div className="glass-strong not-found-card">
        <div className="not-found-icon">🔍</div>
        <h1>404</h1>
        <h2>{t('common.notFound')}</h2>
        <p>{t('common.notFoundHint')}</p>
        <Link to="/" className="btn btn-primary">{t('common.backHome')}</Link>
      </div>
    </div>
  );
}
