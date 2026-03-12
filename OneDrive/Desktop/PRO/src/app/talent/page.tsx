'use client';

import Link from 'next/link';

export default function TalentLanding() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border/50 bg-white/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-medium tracking-tight">
                        <span className="font-bold">AlloySphere</span>
                    </Link>
                    <div className="flex items-center gap-5">
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
                        <Link href="/signup/talent" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-xl transition-all hover:bg-primary/90">
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="max-w-5xl mx-auto px-6 py-24">
                    <p className="text-sm font-medium mb-4 text-primary">For Talent</p>
                    <h1 className="text-4xl font-bold tracking-tight mb-4 max-w-lg leading-tight">Work with verified founders. Get paid per milestone.</h1>
                    <p className="max-w-md text-muted-foreground text-lg leading-relaxed mb-8">
                        Join startups that have passed verification. Every engagement starts with a signed agreement. Every payment is tracked.
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                        <Link href="/signup/talent" className="text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-xl transition-all hover:bg-primary/90">
                            Create talent account
                        </Link>
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Already have an account?
                        </Link>
                    </div>
                </section>

                <hr className="border-border/50 max-w-5xl mx-auto" />

                <section className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="text-3xl font-bold tracking-tight mb-10">What talent uses AlloySphere for</h2>
                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-10">
                        {[
                            ['Verified startups', 'Only apply to startups with verified founders. Trust scores and KYC status are visible upfront.'],
                            ['Milestone payments', 'Get paid per deliverable. Payment tracking and receipt management built into the platform.'],
                            ['Skill verification', 'Complete assessments to earn verified skill badges that founders trust.'],
                            ['Legal protection', 'Every engagement starts with a signed agreement. Dispute resolution is built in.'],
                            ['Trust score', 'Build your professional reputation through completed milestones and verified credentials.'],
                            ['Direct messaging', 'Communicate with founders directly through the platform.'],
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
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Start building your profile.</h2>
                    <p className="text-muted-foreground text-lg mb-8">Free to join. Apply to verified startups immediately.</p>
                    <Link href="/signup/talent" className="inline-block text-sm font-medium bg-primary text-primary-foreground px-6 py-3 rounded-xl transition-all hover:bg-primary/90">
                        Create talent account
                    </Link>
                </section>
            </main>

            <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} AlloySphere
            </footer>
        </div>
    );
}
