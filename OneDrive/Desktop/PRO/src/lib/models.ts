// Proxy file to ensure backward compatibility and easy exports
// Re-exports all individually extracted modular schemas

export * from './models/user.model';
export * from './models/startup.model';
export * from './models/application.model';

export * from './models/milestone.model';
export * from './models/funding.model';
export * from './models/message.model';
export * from './models/verification.model';
export * from './models/job.model';
export * from './models/misc.model';
export * from './models/team-member.model';
export * from './models/achievement.model';
export * from './models/investment.model';

export * from './models/pitch.model';
export * from './models/investment-confirmation.model';
export * from './models/journey-post.model';

// Extracted models
export * from './models/trust-score-log.model';
export * from './models/dispute.model';
export * from './models/payment.model';
export * from './models/subscription.model';
export * from './models/notification.model';
