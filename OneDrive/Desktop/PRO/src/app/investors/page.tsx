'use client';

import Link from 'next/link';

export default function InvestorLanding() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border/50 bg-white/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-medium tracking-tight">
                        <span className="font-bold">AlloySphere</span>
                    </Link>
                    <div className="flex items-center gap-5">
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
                        <Link href="/signup/investor" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-xl transition-all hover:bg-primary/90">
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="max-w-5xl mx-auto px-6 py-24">
                    <p className="text-sm font-medium mb-4 text-primary">For Investors</p>
                    <h1 className="text-4xl font-bold tracking-tight mb-4 max-w-lg leading-tight">Verified deal flow. Transparent risk.</h1>
                    <p className="max-w-md text-muted-foreground text-lg leading-relaxed mb-8">
                        Invest in trust-verified startups. Every founder passes KYC. Every agreement is signed on-platform. Every risk factor is visible.
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                        <Link href="/signup/investor" className="text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-xl transition-all hover:bg-primary/90">
                            Create investor account
                        </Link>
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Already have an account?
                        </Link>
                    </div>
                </section>

                <hr className="border-border/50 max-w-5xl mx-auto" />

                <section className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="text-3xl font-bold tracking-tight mb-10">What investors use AlloySphere for</h2>
                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-10">
                        {[
                            ['Verified deal flow', 'Browse startups with verified founders, transparent trust scores, and documented team composition.'],
                            ['Accreditation controls', 'Only Level 3 verified investors can invest. Protects both sides of every transaction.'],
                            ['Due diligence tools', 'Request access to documents, review milestone history, and audit team performance before committing.'],
                            ['Risk transparency', 'Trust scores, dispute records, and agreement history — all visible before you write a check.'],
                            ['Portfolio tracking', 'Track equity positions, investment amounts, and startup performance from one dashboard.'],
                            ['Legal agreements', 'Every investment is backed by a digitally signed agreement with an immutable audit trail.'],
                        ].map(([title, desc], i) => (
                            <div key={i}>
                                <p className="font-semibold text-foreground mb-2">{title}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <hr className="border-border/50 max-w-5xl mx-auto" />

                <section className="max-w-5xl mx-auto px-6 py-24 text-center">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Start your due diligence.</h2>
                    <p className="text-muted-foreground text-lg mb-8">Free to create an account. Browse startups before investing.</p>
                    <Link href="/signup/investor" className="inline-block text-sm font-medium bg-primary text-primary-foreground px-6 py-3 rounded-xl transition-all hover:bg-primary/90">
                        Create investor account
                    </Link>
                </section>
            </main>

            <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} AlloySphere
            </footer>
        </div>
    );
}
