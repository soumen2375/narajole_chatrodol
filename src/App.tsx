import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from '@/components/layout/ScrollToTop';
import ProtectedRoute from '@/components/ui/ProtectedRoute';
import { PageSkeleton } from '@/components/ui/Skeleton';

const PublicLayout = lazy(() => import('@/components/layout/PublicLayout'));
const Home = lazy(() => import('@/pages/Home'));
const About = lazy(() => import('@/pages/About'));
const Programs = lazy(() => import('@/pages/Programs'));
const Events = lazy(() => import('@/pages/Events'));
const EventDetail = lazy(() => import('@/pages/EventDetail'));
const Gallery = lazy(() => import('@/pages/Gallery'));
const Impacts = lazy(() => import('@/pages/Impacts'));
const Transparency = lazy(() => import('@/pages/Transparency'));
const Contact = lazy(() => import('@/pages/Contact'));
const Volunteer = lazy(() => import('@/pages/Volunteer'));
const Donate = lazy(() => import('@/pages/Donate'));
const Login = lazy(() => import('@/pages/Login'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const Terms = lazy(() => import('@/pages/legal/Terms'));
const Privacy = lazy(() => import('@/pages/legal/Privacy'));
const Refunds = lazy(() => import('@/pages/legal/Refunds'));
const Shipping = lazy(() => import('@/pages/legal/Shipping'));

const MemberLayout = lazy(() => import('@/pages/member/MemberLayout'));
const MemberDashboard = lazy(() => import('@/pages/member/MemberDashboard'));
const MemberProfile = lazy(() => import('@/pages/member/MemberProfile'));
const MemberPosts = lazy(() => import('@/pages/member/MemberPosts'));
const MemberAttendance = lazy(() => import('@/pages/member/MemberAttendance'));
const MemberContributions = lazy(() => import('@/pages/member/MemberContributions'));
const MemberDonations = lazy(() => import('@/pages/member/MemberDonations'));
const MemberGallery = lazy(() => import('@/pages/member/MemberGallery'));
const MemberDirectory = lazy(() => import('@/pages/member/MemberDirectory'));
const MemberMessages = lazy(() => import('@/pages/member/MemberMessages'));

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminMembers = lazy(() => import('@/pages/admin/AdminMembers'));
const AdminMemberDetail = lazy(() => import('@/pages/admin/AdminMemberDetail'));
const AdminPosts = lazy(() => import('@/pages/admin/AdminPosts'));
const AdminGallery = lazy(() => import('@/pages/admin/AdminGallery'));
const AdminEvents = lazy(() => import('@/pages/admin/AdminEvents'));
const AdminEventsDashboard = lazy(() => import('@/pages/admin/AdminEventsDashboard'));
const AdminEventDetail = lazy(() => import('@/pages/admin/AdminEventDetail'));
const AdminBloodCamp = lazy(() => import('@/pages/admin/AdminBloodCamp'));
const AdminAttendance = lazy(() => import('@/pages/admin/AdminAttendance'));
const AdminContributions = lazy(() => import('@/pages/admin/AdminContributions'));
const AdminDonations = lazy(() => import('@/pages/admin/AdminDonations'));
const AdminExpenses = lazy(() => import('@/pages/admin/AdminExpenses'));
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'));
const AdminFinance = lazy(() => import('@/pages/admin/AdminFinance'));
const AdminBudgets = lazy(() => import('@/pages/admin/AdminBudgets'));
const AdminLedger = lazy(() => import('@/pages/admin/AdminLedger'));
const AdminAudit = lazy(() => import('@/pages/admin/AdminAudit'));
const AdminCompliance = lazy(() => import('@/pages/admin/AdminCompliance'));
const AdminRefunds = lazy(() => import('@/pages/admin/AdminRefunds'));
const AdminCampaigns = lazy(() => import('@/pages/admin/AdminCampaigns'));
const AdminPayroll = lazy(() => import('@/pages/admin/AdminPayroll'));
const AdminBankAccounts = lazy(() => import('@/pages/admin/AdminBankAccounts'));
const AdminApprovals = lazy(() => import('@/pages/admin/AdminApprovals'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminGrants = lazy(() => import('@/pages/admin/AdminGrants'));
const AdminMessages = lazy(() => import('@/pages/admin/AdminMessages'));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/impacts" element={<Impacts />} />
            <Route path="/transparency" element={<Transparency />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/volunteer" element={<Volunteer />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refunds" element={<Refunds />} />
            <Route path="/shipping" element={<Shipping />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />

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
            <Route path="gallery" element={<MemberGallery />} />
            <Route path="attendance" element={<MemberAttendance />} />
            <Route path="contributions" element={<MemberContributions />} />
            <Route path="donations" element={<MemberDonations />} />
            <Route path="directory" element={<MemberDirectory />} />
            <Route path="messages" element={<MemberMessages />} />

            {/* Dynamic Capability-Guarded Sub-Routes inside Member Panel */}
            <Route path="posts-manage" element={<ProtectedRoute require="canManagePosts"><AdminPosts /></ProtectedRoute>} />
            <Route path="categories" element={<ProtectedRoute require="canManagePosts"><AdminCategories /></ProtectedRoute>} />
            <Route path="gallery-manage" element={<ProtectedRoute require="canManagePosts"><AdminGallery /></ProtectedRoute>} />
            
            <Route path="event-dashboard" element={<ProtectedRoute require="canManageEvents"><AdminEventsDashboard /></ProtectedRoute>} />
            <Route path="events" element={<ProtectedRoute require="canManageEvents"><AdminEvents /></ProtectedRoute>} />
            <Route path="events/:id" element={<ProtectedRoute require="canManageEvents"><AdminEventDetail /></ProtectedRoute>} />
            <Route path="events/:id/blood" element={<ProtectedRoute require="canManageEvents"><AdminBloodCamp /></ProtectedRoute>} />
            <Route path="attendance-manage" element={<ProtectedRoute require="canManageEvents"><AdminAttendance /></ProtectedRoute>} />

            <Route path="finance" element={<ProtectedRoute require="canManageFinance"><AdminFinance /></ProtectedRoute>} />
            <Route path="budgets" element={<ProtectedRoute require="canManageFinance"><AdminBudgets /></ProtectedRoute>} />
            <Route path="contributions-manage" element={<ProtectedRoute require="canManageFinance"><AdminContributions /></ProtectedRoute>} />
            <Route path="donations-manage" element={<ProtectedRoute require="canManageFinance"><AdminDonations /></ProtectedRoute>} />
            <Route path="expenses" element={<ProtectedRoute require="canManageFinance"><AdminExpenses /></ProtectedRoute>} />
            <Route path="ledger" element={<ProtectedRoute require="canManageFinance"><AdminLedger /></ProtectedRoute>} />
          </Route>

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
            <Route path="members/:id" element={<AdminMemberDetail />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="gallery" element={<AdminGallery />} />
            <Route path="event-dashboard" element={<AdminEventsDashboard />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="events/:id" element={<AdminEventDetail />} />
            <Route path="events/:id/blood" element={<AdminBloodCamp />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="contributions" element={<AdminContributions />} />
            <Route path="donations" element={<AdminDonations />} />
            <Route path="expenses" element={<AdminExpenses />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="budgets" element={<AdminBudgets />} />
            <Route path="ledger" element={<AdminLedger />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="compliance" element={<AdminCompliance />} />
            <Route path="refunds" element={<AdminRefunds />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
            <Route path="payroll" element={<AdminPayroll />} />
            <Route path="bank" element={<AdminBankAccounts />} />
            <Route path="approvals" element={<AdminApprovals />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="grants" element={<AdminGrants />} />
            <Route path="messages" element={<AdminMessages />} />
          </Route>

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
