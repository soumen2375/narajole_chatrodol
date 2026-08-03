// AdminPosts.tsx → Redirect to new CMS Dashboard
// Kept for route backward-compatibility; old /admin/posts now redirects to /admin/cms
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminPosts() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/admin/cms', { replace: true }); }, [navigate]);
  return null;
}
