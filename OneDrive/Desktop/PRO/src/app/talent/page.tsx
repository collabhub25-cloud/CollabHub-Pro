'use client';

import Link from 'next/link';

export default function TalentLanding() {
    return (
        <div className="min-h-screen" style={{ background: '#F4F2ED', color: '#2A2623' }}>
            <header className="border-b" style={{ borderColor: '#D8D2C8' }}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-medium" style={{ letterSpacing: '0.3px' }}>
                        <span>Collab</span><span style={{ color: '#8A6C8F' }}>·</span><span>Hub</span>
                    </Link>
                    <div className="flex items-center gap-5">
                        <Link href="/login" className="text-sm" style={{ color: '#6C635C' }}>Sign in</Link>
                        <Link href="/signup/talent" className="text-sm font-medium text-[#FBF9F6] px-3.5 py-2 rounded transition-colors" style={{ background: '#8A6C8F' }}>
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="max-w-5xl mx-auto px-6" style={{ paddingTop: '96px', paddingBottom: '72px' }}>
                    <p className="text-sm font-medium mb-4" style={{ color: '#8A6C8F' }}>For Talent</p>
                    <h1 className="mb-4 max-w-lg">Work with verified founders. Get paid per milestone.</h1>
                    <p className="max-w-md" style={{ color: '#6C635C', fontSize: '16px', lineHeight: '1.7', marginBottom: '32px' }}>
                        Join startups that have passed verification. Every engagement starts with a signed agreement. Every payment is tracked.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/signup/talent" className="text-sm font-medium text-[#FBF9F6] px-4 py-2.5 rounded transition-colors" style={{ background: '#8A6C8F' }}>
                            Create talent account
                        </Link>
                        <Link href="/login" className="text-sm" style={{ color: '#6C635C' }}>
                            Already have an account?
                        </Link>
                    </div>
                </section>

                <hr style={{ borderColor: '#D8D2C8', maxWidth: '64rem', margin: '0 auto' }} />

                <section className="max-w-5xl mx-auto px-6" style={{ paddingTop: '72px', paddingBottom: '64px' }}>
                    <h2 className="mb-10">What talent uses CollabHub for</h2>
                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-8">
                        {[
                            ['Verified startups', 'Only apply to startups with verified founders. Trust scores and KYC status are visible upfront.'],
                            ['Milestone payments', 'Get paid per deliverable. Payment tracking and receipt management built into the platform.'],
                            ['Skill verification', 'Complete assessments to earn verified skill badges that founders trust.'],
                            ['Legal protection', 'Every engagement starts with a signed agreement. Dispute resolution is built in.'],
                            ['Trust score', 'Build your professional reputation through completed milestones and verified credentials.'],
                            ['Direct messaging', 'Communicate with founders directly through the platform.'],
                        ].map(([title, desc], i) => (
                            <div key={i}>
                                <p className="font-medium mb-1">{title}</p>
                                <p className="text-sm" style={{ color: '#6C635C', lineHeight: '1.6' }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <hr style={{ borderColor: '#D8D2C8', maxWidth: '64rem', margin: '0 auto' }} />

                <section className="max-w-5xl mx-auto px-6" style={{ paddingTop: '64px', paddingBottom: '80px' }}>
                    <h2 className="mb-3">Start building your profile.</h2>
                    <p className="mb-6" style={{ color: '#6C635C', fontSize: '15px' }}>Free to join. Apply to verified startups immediately.</p>
                    <Link href="/signup/talent" className="text-sm font-medium text-[#FBF9F6] px-4 py-2.5 rounded transition-colors" style={{ background: '#8A6C8F' }}>
                        Create talent account
                    </Link>
                </section>
            </main>

            <footer className="border-t py-5 text-center text-sm" style={{ borderColor: '#D8D2C8', color: '#6C635C' }}>
                © {new Date().getFullYear()} CollabHub
            </footer>
        </div>
    );
}
