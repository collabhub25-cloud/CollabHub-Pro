import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground py-16 px-6 sm:px-12 lg:px-24">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="mb-12">
                    <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
                    <p className="text-muted-foreground">Last Updated: March 2026</p>
                </header>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">1. Overview</h2>
                    <p className="text-muted-foreground">
                        AlloySphere values your privacy. This policy outlines how we collect, use, and protect your personal data when you interact with our platform, whether you are a Founder, Investor, or Talent.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">2. Data We Collect</h2>
                    <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                        <li><strong>Account Data:</strong> Name, email address, and authentication credentials (e.g., Google OAuth data).</li>
                        <li><strong>Profile Data:</strong> Skills, experience, startup details, investment preferences, and portfolio links.</li>
                        <li><strong>Platform Activity:</strong> Messages, alliances, milestones, and agreements formed on AlloySphere.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">3. How We Use Your Data</h2>
                    <p className="text-muted-foreground">
                        We use the collected data to provide and improve the AlloySphere ecosystem. Specifically:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-2 text-muted-foreground">
                        <li>To align Talent and Investors with compatible Startups using our matching algorithms.</li>
                        <li>To verify user authenticity and maintain the Trust Score system.</li>
                        <li>To securely process legally binding agreements (such as NDAs and Investment terms) between users.</li>
                        <li>To send important notifications (e.g., alliance requests, milestone updates).</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">4. Data Sharing and Confidentiality</h2>
                    <p className="text-muted-foreground">
                        We do not sell your personal data. We may share information:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-2 text-muted-foreground">
                        <li><strong>With connected users:</strong> Elements of your profile are visible to others to foster collaboration. Private agreements are only accessible to the involved parties.</li>
                        <li><strong>For legal reasons:</strong> If requested by law enforcement or necessary to enforce our Terms of Service.</li>
                    </ul>
                </section>

                <footer className="mt-16 pt-8 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
                    <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                    <Link href="/" className="hover:text-primary transition-colors">Back to Home</Link>
                </footer>
            </div>
        </div>
    );
}
