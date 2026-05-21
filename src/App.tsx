import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from '@/components/layout/ScrollToTop';
import PublicLayout from '@/components/layout/PublicLayout';
import ProtectedRoute from '@/components/ui/ProtectedRoute';

import Home from '@/pages/Home';
import About from '@/pages/About';
import Programs from '@/pages/Programs';
import Events from '@/pages/Events';
import Gallery from '@/pages/Gallery';
import Impacts from '@/pages/Impacts';
import Contact from '@/pages/Contact';
import Volunteer from '@/pages/Volunteer';
import Donate from '@/pages/Donate';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

import MemberLayout from '@/pages/member/MemberLayout';
import MemberDashboard from '@/pages/member/MemberDashboard';
import MemberProfile from '@/pages/member/MemberProfile';
import MemberPosts from '@/pages/member/MemberPosts';
import MemberAttendance from '@/pages/member/MemberAttendance';
import MemberContributions from '@/pages/member/MemberContributions';
import MemberDonations from '@/pages/member/MemberDonations';

import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminMembers from '@/pages/admin/AdminMembers';
import AdminPosts from '@/pages/admin/AdminPosts';
import AdminEvents from '@/pages/admin/AdminEvents';
import AdminAttendance from '@/pages/admin/AdminAttendance';
import AdminContributions from '@/pages/admin/AdminContributions';
import AdminDonations from '@/pages/admin/AdminDonations';
import AdminMessages from '@/pages/admin/AdminMessages';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/events" element={<Events />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/impacts" element={<Impacts />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/donate" element={<Donate />} />
        </Route>

        <Route path="/login" element={<Login />} />

        {/* Member dashboard */}
        <Route
          path="/member"
          element={
            <ProtectedRoute>
              <MemberLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MemberDashboard />} />
          <Route path="profile" element={<MemberProfile />} />
          <Route path="posts" element={<MemberPosts />} />
          <Route path="attendance" element={<MemberAttendance />} />
          <Route path="contributions" element={<MemberContributions />} />
          <Route path="donations" element={<MemberDonations />} />
        </Route>

        {/* Admin dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="contributions" element={<AdminContributions />} />
          <Route path="donations" element={<AdminDonations />} />
          <Route path="messages" element={<AdminMessages />} />
        </Route>

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  );
}
