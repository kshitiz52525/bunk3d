// SEED DATA. Mock only. Obviously fake accounts, one per role. Never real people.
import type { StaffIdentity } from '../contract';

export const MOCK_STAFF_PASSWORD = 'bunk3d-staff-dev';
export const MOCK_STAFF_CODE = '123456';

export const SEED_STAFF: StaffIdentity[] = [
  { id: 's_club_lead', name: 'Seed Club Lead', email: 'club.lead@seed.example', role: 'club_lead', scope: { clubId: 'gdg', campusId: 'atria' } },
  { id: 's_club_coord', name: 'Seed Coordinator', email: 'club.coordinator@seed.example', role: 'club_coordinator', scope: { clubId: 'gdg', campusId: 'atria' } },
  { id: 's_college', name: 'Seed College Admin', email: 'college.admin@seed.example', role: 'college_admin', scope: { campusId: 'atria' } },
  { id: 's_brand_owner', name: 'Seed Brand Owner', email: 'brand.owner@seed.example', role: 'brand_owner', scope: { brandId: 'brand-alpha' } },
  { id: 's_brand_member', name: 'Seed Brand Member', email: 'brand.member@seed.example', role: 'brand_member', scope: { brandId: 'brand-alpha' } },
  { id: 's_vendor', name: 'Seed Vendor', email: 'vendor@seed.example', role: 'vendor', scope: { vendorId: 'vendor-one' } },
  { id: 's_finance', name: 'Seed Finance', email: 'finance@seed.example', role: 'finance', scope: {} },
  { id: 's_finance_appr', name: 'Seed Finance Approver', email: 'finance.approver@seed.example', role: 'finance_approver', scope: {} },
  { id: 's_ops', name: 'Seed Operations', email: 'ops@seed.example', role: 'ops', scope: {} },
  { id: 's_ops_lead', name: 'Seed Operations Lead', email: 'ops.lead@seed.example', role: 'ops_lead', scope: {} },
];
