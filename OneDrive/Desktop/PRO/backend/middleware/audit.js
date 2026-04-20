import AuditLog from '../models/AuditLog.js';

/**
 * Log all admin actions to the audit log
 */
export async function logAdminAction({ adminEmail, action, resource, resourceId, details, req }) {
  try {
    await AuditLog.create({
      adminEmail: adminEmail || 'unknown',
      action,
      resource,
      resourceId: resourceId?.toString(),
      details,
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown',
    });
  } catch (err) {
    console.error('Failed to log admin action:', err.message);
  }
}

/**
 * Create AdminJS after/before hooks for audit logging
 */
export function createAuditHook(resourceName) {
  return {
    after: {
      new: async (response, request, context) => {
        if (response.record && !response.record.errors?.length) {
          await logAdminAction({
            adminEmail: context?.currentAdmin?.email,
            action: 'create',
            resource: resourceName,
            resourceId: response.record.params?._id,
            details: { params: response.record.params },
            req: request,
          });
        }
        return response;
      },
      edit: async (response, request, context) => {
        if (response.record && !Object.keys(response.record.errors || {}).length) {
          await logAdminAction({
            adminEmail: context?.currentAdmin?.email,
            action: 'update',
            resource: resourceName,
            resourceId: response.record.params?._id,
            details: { params: response.record.params },
            req: request,
          });
        }
        return response;
      },
      delete: async (response, request, context) => {
        await logAdminAction({
          adminEmail: context?.currentAdmin?.email,
          action: 'delete',
          resource: resourceName,
          resourceId: request.params?.recordId,
          req: request,
        });
        return response;
      },
    },
  };
}
