'use client';

import Link from 'next/link';

export default function InvestorLanding() {
    return (
        <div className="min-h-screen" style={{ background: '#1A2332', color: '#C8CDD4' }}>
            <header className="border-b" style={{ borderColor: '#2A3545' }}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-medium text-white" style={{ letterSpacing: '0.3px' }}>
                        <span>Collab</span><span style={{ color: '#5A8AB5' }}>·</span><span>Hub</span>
                    </Link>
                    <div className="flex items-center gap-5">
                        <Link href="/login" className="text-sm" style={{ color: '#8897A8' }}>Sign in</Link>
                        <Link href="/signup/investor" className="text-sm font-medium text-white px-3.5 py-2 rounded transition-colors" style={{ background: '#2E4057' }}>
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="max-w-5xl mx-auto px-6" style={{ paddingTop: '96px', paddingBottom: '72px' }}>
                    <p className="text-sm font-medium mb-4" style={{ color: '#5A8AB5' }}>For Investors</p>
                    <h1 className="text-white mb-4 max-w-lg">Verified deal flow. Transparent risk.</h1>
                    <p className="max-w-md" style={{ color: '#8897A8', fontSize: '16px', lineHeight: '1.7', marginBottom: '32px' }}>
                        Invest in trust-verified startups. Every founder passes KYC. Every agreement is signed on-platform. Every risk factor is visible.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/signup/investor" className="text-sm font-medium text-white px-4 py-2.5 rounded transition-colors" style={{ background: '#2E4057' }}>
                            Create investor account
                        </Link>
                        <Link href="/login" className="text-sm" style={{ color: '#8897A8' }}>
                            Already have an account?
                        </Link>
                    </div>
                </section>

                <hr style={{ borderColor: '#2A3545', maxWidth: '64rem', margin: '0 auto' }} />

                <section className="max-w-5xl mx-auto px-6" style={{ paddingTop: '72px', paddingBottom: '64px' }}>
                    <h2 className="text-white mb-10">What investors use CollabHub for</h2>
                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-8">
                        {[
                            ['Verified deal flow', 'Browse startups with verified founders, transparent trust scores, and documented team composition.'],
                            ['Accreditation controls', 'Only Level 3 verified investors can invest. Protects both sides of every transaction.'],
                            ['Due diligence tools', 'Request access to documents, review milestone history, and audit team performance before committing.'],
                            ['Risk transparency', 'Trust scores, dispute records, and agreement history — all visible before you write a check.'],
                            ['Portfolio tracking', 'Track equity positions, investment amounts, and startup performance from one dashboard.'],
                            ['Legal agreements', 'Every investment is backed by a digitally signed agreement with an immutable audit trail.'],
                        ].map(([title, desc], i) => (
                            <div key={i}>
                                <p className="font-medium text-white mb-1">{title}</p>
                                <p className="text-sm" style={{ color: '#8897A8', lineHeight: '1.6' }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <hr style={{ borderColor: '#2A3545', maxWidth: '64rem', margin: '0 auto' }} />

                <section className="max-w-5xl mx-auto px-6" style={{ paddingTop: '64px', paddingBottom: '80px' }}>
                    <h2 className="text-white mb-3">Start your due diligence.</h2>
                    <p className="mb-6" style={{ color: '#8897A8', fontSize: '15px' }}>Free to create an account. Browse startups before investing.</p>
                    <Link href="/signup/investor" className="text-sm font-medium text-white px-4 py-2.5 rounded transition-colors" style={{ background: '#2E4057' }}>
                        Create investor account
                    </Link>
                </section>
            </main>

            <footer className="border-t py-5 text-center text-sm" style={{ borderColor: '#2A3545', color: '#5A6474' }}>
                © {new Date().getFullYear()} CollabHub
            </footer>
        </div>
    );
}
