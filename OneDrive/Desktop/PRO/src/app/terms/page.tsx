import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground py-16 px-6 sm:px-12 lg:px-24">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="mb-12">
                    <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
                    <p className="text-muted-foreground">Last Updated: March 2026</p>
                </header>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">1. Introduction</h2>
                    <p className="text-muted-foreground">
                        Welcome to AlloySphere. These Terms of Service ("Terms") govern your use of the AlloySphere platform.
                        By creating an account, you agree to be bound by these Terms and our Privacy Policy.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">2. Roles and Responsibilities</h2>
                    <p className="text-muted-foreground">
                        AlloySphere operates a multi-sided ecosystem designed to facilitate collaboration, investment, and team building.
                        Depending on your selected role upon signup, specific terms apply:
                    </p>

                    <div className="mt-6 space-y-6 pl-4 border-l-2 border-primary/20">
                        <div>
                            <h3 className="text-xl font-medium text-primary">2.1 Founders</h3>
                            <ul className="list-disc pl-5 mt-2 space-y-2 text-muted-foreground">
                                <li><strong>Startup Representation:</strong> You represent and warrant that you have the authority to create and manage the startup profile.</li>
                                <li><strong>Agreements & Equity:</strong> Any NDA or Investment Agreements formed through the platform are legally binding. AlloySphere provides these templates as tools but is not a party to the agreements.</li>
                                <li><strong>Team Management:</strong> You are responsible for accurately defining roles and compensation for talent joining your team.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium text-primary">2.2 Investors</h3>
                            <ul className="list-disc pl-5 mt-2 space-y-2 text-muted-foreground">
                                <li><strong>Accreditation:</strong> You may be required to verify your status as an accredited investor to participate in funding rounds depending on your jurisdiction.</li>
                                <li><strong>Due Diligence:</strong> AlloySphere provides a Trust Score and verification tools, but you are solely responsible for conducting your own due diligence before committing capital.</li>
                                <li><strong>Confidentiality:</strong> You agree to maintain the confidentiality of any proprietary information shared by Founders during pitch or negotiation phases (e.g., via NDA).</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium text-primary">2.3 Talent / Individual Professionals</h3>
                            <ul className="list-disc pl-5 mt-2 space-y-2 text-muted-foreground">
                                <li><strong>Work Deliverables:</strong> You agree to fulfill milestones and deliverables faithfully as agreed upon with Founders.</li>
                                <li><strong>Compensation:</strong> Understand that equity-based compensation carries inherent risks and depends on the startup's success. Both parties should clearly define the vesting schedules in their agreements.</li>
                                <li><strong>Professionalism:</strong> Maintain accurate profile details, including your skills and experience.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">3. Alliances and Trust Scores</h2>
                    <p className="text-muted-foreground">
                        AlloySphere tracks interactions, milestone completions, and user feedback through a Trust Score system. Forming Alliances requires mutual consent. Misuse of the platform may result in Trust Score penalties or account suspension.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">4. Dispute Resolution</h2>
                    <p className="text-muted-foreground">
                        In the event of a dispute related to a milestone or an agreement, users agree to attempt resolution through the AlloySphere Dispute System before pursuing external legal action.
                    </p>
                </section>

                <footer className="mt-16 pt-8 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
                    <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                    <Link href="/" className="hover:text-primary transition-colors">Back to Home</Link>
                </footer>
            </div>
        </div>
    );
}
