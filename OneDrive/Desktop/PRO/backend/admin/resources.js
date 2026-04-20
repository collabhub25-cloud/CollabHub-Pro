import User from '../models/User.js';
import Startup from '../models/Startup.js';
import Pitch from '../models/Pitch.js';
import AdminUser from '../models/AdminUser.js';
import AuditLog from '../models/AuditLog.js';
import Payment from '../models/Payment.js';
import SkillTest from '../models/SkillTest.js';
import { createAuditHook } from '../middleware/audit.js';

/**
 * Build AdminJS configuration with all resources
 */
export function getAdminResources() {
  return [
    // =============================================
    // USER MANAGEMENT
    // =============================================
    {
      resource: User,
      options: {
        navigation: { name: 'User Management', icon: 'User' },
        listProperties: ['name', 'email', 'role', 'verificationLevel', 'isEmailVerified', 'createdAt'],
        showProperties: [
          'name', 'email', 'role', 'avatar', 'verificationLevel',
          'bio', 'skills', 'location', 'isEmailVerified',
          'skillTestScores', 'lastActive', 'createdAt', 'updatedAt',
        ],
        editProperties: [
          'name', 'email', 'role', 'verificationLevel',
          'bio', 'skills', 'location', 'isEmailVerified',
        ],
        filterProperties: ['name', 'email', 'role', 'verificationLevel', 'isEmailVerified', 'createdAt'],
        properties: {
          _id: { isVisible: { list: false, show: true, edit: false, filter: false } },
          passwordHash: { isVisible: false },
          verificationOtpHash: { isVisible: false },
          verificationOtpExpires: { isVisible: false },
          verificationOtpAttempts: { isVisible: false },
          resetPasswordOtpHash: { isVisible: false },
          resetPasswordOtpExpires: { isVisible: false },
          resetPasswordOtpAttempts: { isVisible: false },
          googleId: { isVisible: false },
          skillTestScores: {
            isVisible: { list: false, show: true, edit: false, filter: false },
            isArray: true,
          },
          role: {
            availableValues: [
              { value: 'founder', label: 'Founder' },
              { value: 'talent', label: 'Talent' },
              { value: 'investor', label: 'Investor' },
              { value: 'admin', label: 'Admin' },
            ],
          },
          verificationLevel: {
            availableValues: [
              { value: 0, label: 'Level 0 — Unverified' },
              { value: 1, label: 'Level 1 — Basic' },
              { value: 2, label: 'Level 2 — Verified' },
              { value: 3, label: 'Level 3 — Trusted' },
              { value: 4, label: 'Level 4 — Expert' },
              { value: 5, label: 'Level 5 — Premium' },
            ],
          },
        },
        actions: {
          new: { ...createAuditHook('User').after?.new ? { after: [createAuditHook('User').after.new] } : {} },
          edit: { ...createAuditHook('User').after?.edit ? { after: [createAuditHook('User').after.edit] } : {} },
          delete: { ...createAuditHook('User').after?.delete ? { after: [createAuditHook('User').after.delete] } : {} },
        },
        sort: { sortBy: 'createdAt', direction: 'desc' },
      },
    },

    // =============================================
    // STARTUP CONTROL
    // =============================================
    {
      resource: Startup,
      options: {
        navigation: { name: 'Startup Control', icon: 'Archive' },
        listProperties: ['name', 'industry', 'stage', 'verificationStatus', 'AlloySphereVerified', 'isActive', 'createdAt'],
        showProperties: [
          'name', 'founderId', 'vision', 'description', 'industry', 'stage',
          'fundingStage', 'team', 'rolesNeeded', 'skillsNeeded',
          'verificationStatus', 'verificationRequestedAt', 'verifiedAt',
          'AlloySphereVerified', 'AlloySphereVerifiedAt', 'verificationNotes',
          'isActive', 'isBoosted', 'boostExpiresAt',
          'website', 'logo', 'pitchDeck',
          'createdAt', 'updatedAt',
        ],
        editProperties: [
          'name', 'vision', 'description', 'industry', 'stage', 'fundingStage',
          'verificationNotes',
          'isActive', 'isBoosted', 'boostExpiresAt',
        ],
        filterProperties: ['name', 'industry', 'stage', 'verificationStatus', 'AlloySphereVerified', 'isActive', 'createdAt'],
        properties: {
          _id: { isVisible: { list: false, show: true, edit: false, filter: false } },
          AlloySphereVerified: { type: 'boolean' },
          founderId: { isVisible: { list: false, show: true, edit: false, filter: false } },
          // Prevent founders from editing these via admin panel
          verificationStatus: {
            isVisible: { list: true, show: true, edit: false, filter: true },
            availableValues: [
              { value: 'none', label: 'None' },
              { value: 'pending', label: '🟡 Pending' },
              { value: 'approved', label: '✅ Approved' },
              { value: 'rejected', label: '❌ Rejected' },
            ],
          },
          verificationRequestedAt: {
            isVisible: { list: false, show: true, edit: false, filter: false },
          },
          verifiedAt: {
            isVisible: { list: false, show: true, edit: false, filter: false },
          },
        },
        actions: {
          // Custom action: Approve verification
          approveVerification: {
            actionType: 'record',
            label: '✅ Approve Verification',
            icon: 'CheckCircle',
            guard: 'Are you sure you want to APPROVE this startup?',
            handler: async (request, response, context) => {
              const { record, currentAdmin } = context;
              await Startup.findByIdAndUpdate(record.params._id, {
                AlloySphereVerified: true,
                AlloySphereVerifiedAt: new Date(),
                AlloySphereVerifiedBy: currentAdmin.id,
                verificationStatus: 'approved',
                verifiedAt: new Date(),
                verificationNotes: `Approved by ${currentAdmin.email} on ${new Date().toISOString()}`,
              });
              return {
                record: record.toJSON(currentAdmin),
                redirectUrl: context.h.recordActionUrl({ resourceId: 'Startup', recordId: record.params._id, actionName: 'show' }),
                notice: { message: 'Startup verified successfully! ✅', type: 'success' },
              };
            },
            // Only show on pending requests
            isVisible: (context) => context.record?.params?.verificationStatus === 'pending',
            component: false,
          },
          // Custom action: Reject verification
          rejectVerification: {
            actionType: 'record',
            label: '❌ Reject Verification',
            icon: 'XCircle',
            guard: 'Are you sure you want to REJECT this startup verification?',
            handler: async (request, response, context) => {
              const { record, currentAdmin } = context;
              await Startup.findByIdAndUpdate(record.params._id, {
                AlloySphereVerified: false,
                verificationStatus: 'rejected',
                verifiedAt: null,
                verificationNotes: `Rejected by ${currentAdmin.email} on ${new Date().toISOString()}`,
              });
              return {
                record: record.toJSON(currentAdmin),
                redirectUrl: context.h.recordActionUrl({ resourceId: 'Startup', recordId: record.params._id, actionName: 'show' }),
                notice: { message: 'Startup verification rejected.', type: 'error' },
              };
            },
            // Only show on pending or already-approved requests
            isVisible: (context) => {
              const status = context.record?.params?.verificationStatus;
              return status === 'pending' || status === 'approved';
            },
            component: false,
          },
          new: { ...createAuditHook('Startup').after?.new ? { after: [createAuditHook('Startup').after.new] } : {} },
          edit: { ...createAuditHook('Startup').after?.edit ? { after: [createAuditHook('Startup').after.edit] } : {} },
          delete: { ...createAuditHook('Startup').after?.delete ? { after: [createAuditHook('Startup').after.delete] } : {} },
        },
        sort: { sortBy: 'createdAt', direction: 'desc' },
      },
    },

    // =============================================
    // PLATFORM ACTIVITY — PITCH REQUESTS
    // =============================================
    {
      resource: Pitch,
      options: {
        navigation: { name: 'Platform Activity', icon: 'Activity' },
        listProperties: ['startupId', 'investorId', 'pitchStatus', 'createdAt'],
        showProperties: [
          'startupId', 'founderId', 'investorId', 'pitchStatus',
          'title', 'message', 'amountRequested', 'equityOffered',
          'pitchDocumentUrl', 'pitchSentAt',
          'createdAt', 'updatedAt',
        ],
        editProperties: ['pitchStatus'],
        filterProperties: ['pitchStatus', 'createdAt'],
        properties: {
          _id: { isVisible: { list: false, show: true, edit: false, filter: false } },
          pitchStatus: {
            availableValues: [
              { value: 'requested', label: 'Requested' },
              { value: 'sent', label: 'Sent' },
              { value: 'pending', label: 'Pending' },
              { value: 'viewed', label: 'Viewed' },
              { value: 'interested', label: 'Interested' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'invested', label: 'Invested' },
              { value: 'expired', label: 'Expired' },
            ],
          },
        },
        actions: {
          new: { isAccessible: false }, // Admins shouldn't create pitches
          delete: { isAccessible: false }, // Protect pitch data
          edit: { ...createAuditHook('Pitch').after?.edit ? { after: [createAuditHook('Pitch').after.edit] } : {} },
        },
        sort: { sortBy: 'createdAt', direction: 'desc' },
      },
    },

    // =============================================
    // ADMIN USERS — Self-management
    // =============================================
    {
      resource: AdminUser,
      options: {
        navigation: { name: 'System', icon: 'Settings' },
        listProperties: ['email', 'name', 'role', 'isActive', 'lastLogin'],
        properties: {
          passwordHash: { isVisible: false },
        },
        actions: {
          new: { isAccessible: false }, // Use seed script instead
          delete: { isAccessible: false }, // Protect admin accounts
        },
      },
    },

    // =============================================
    // AUDIT LOGS — Read-only admin activity history
    // =============================================
    {
      resource: AuditLog,
      options: {
        navigation: { name: 'System', icon: 'Settings' },
        listProperties: ['adminEmail', 'action', 'resource', 'resourceId', 'createdAt'],
        filterProperties: ['adminEmail', 'action', 'resource', 'createdAt'],
        properties: {
          _id: { isVisible: { list: false, show: true, edit: false, filter: false } },
        },
        actions: {
          new: { isAccessible: false },
          edit: { isAccessible: false },
          delete: { isAccessible: false },
        },
        sort: { sortBy: 'createdAt', direction: 'desc' },
      },
    },

    // =============================================
    // SUPPORT MODELS (hidden from nav, needed for refs)
    // =============================================
    {
      resource: Payment,
      options: {
        navigation: false,
        listProperties: ['userId', 'type', 'amount', 'status', 'createdAt'],
        actions: {
          new: { isAccessible: false },
          edit: { isAccessible: false },
          delete: { isAccessible: false },
        },
      },
    },
    {
      resource: SkillTest,
      options: {
        navigation: false,
        listProperties: ['title', 'skill', 'difficulty', 'isActive', 'createdAt'],
        actions: {
          new: { isAccessible: false },
          edit: { isAccessible: false },
          delete: { isAccessible: false },
        },
      },
    },
  ];
}
