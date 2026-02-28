'use client';

import Link from 'next/link';

export default function FounderLanding() {
    return (
        <div className="min-h-screen" style={{ background: '#F4F2ED', color: '#2A2623' }}>
            <header className="border-b" style={{ borderColor: '#D8D2C8' }}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-medium" style={{ letterSpacing: '0.3px' }}>
                        <span>Collab</span><span style={{ color: '#B05A4F' }}>·</span><span>Hub</span>
                    </Link>
                    <div className="flex items-center gap-5">
                        <Link href="/login" className="text-sm" style={{ color: '#6C635C' }}>Sign in</Link>
                        <Link href="/signup/founder" className="text-sm font-medium text-[#FBF9F6] px-3.5 py-2 rounded transition-colors" style={{ background: '#B05A4F' }}>
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="max-w-5xl mx-auto px-6" style={{ paddingTop: '96px', paddingBottom: '72px' }}>
                    <p className="text-sm font-medium mb-4" style={{ color: '#B05A4F' }}>For Founders</p>
                    <h1 className="mb-4 max-w-lg">Build your startup with verified collaborators.</h1>
                    <p className="max-w-md" style={{ color: '#6C635C', fontSize: '16px', lineHeight: '1.7', marginBottom: '32px' }}>
                        Hire verified talent, manage milestones, sign agreements digitally, and track payments. Everything a serious founder needs.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/signup/founder" className="text-sm font-medium text-[#FBF9F6] px-4 py-2.5 rounded transition-colors" style={{ background: '#B05A4F' }}>
                            Create founder account
                        </Link>
                        <Link href="/login" className="text-sm" style={{ color: '#6C635C' }}>
                            Already have an account?
                        </Link>
                    </div>
                </section>

                <hr style={{ borderColor: '#D8D2C8', maxWidth: '64rem', margin: '0 auto' }} />

                <section className="max-w-5xl mx-auto px-6" style={{ paddingTop: '72px', paddingBottom: '64px' }}>
                    <h2 className="mb-10">What founders use CollabHub for</h2>
                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-8">
                        {[
                            ['Verified talent hiring', 'Every applicant passes identity and skill verification before they can apply to your startup.'],
                            ['Legal agreements', 'Generate NDAs and contracts. Digital signing with immutable audit trails.'],
                            ['Milestone payments', 'Track deliverables and release payments per milestone. Full receipt tracking built in.'],
                            ['Trust scores', 'Every user earns trust through verification, completed work, and collaboration history.'],
                            ['Funding rounds', 'Create and manage funding rounds. Verified investors discover your startup through the platform.'],
                            ['Team management', 'Manage your team, track applications, and coordinate across multiple startups.'],
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
                    <h2 className="mb-3">Start building.</h2>
                    <p className="mb-6" style={{ color: '#6C635C', fontSize: '15px' }}>Free to create an account. No credit card required.</p>
                    <Link href="/signup/founder" className="text-sm font-medium text-[#FBF9F6] px-4 py-2.5 rounded transition-colors" style={{ background: '#B05A4F' }}>
                        Create founder account
                    </Link>
                </section>
            </main>

            <footer className="border-t py-5 text-center text-sm" style={{ borderColor: '#D8D2C8', color: '#6C635C' }}>
                © {new Date().getFullYear()} CollabHub
            </footer>
        </div>
    );
}
