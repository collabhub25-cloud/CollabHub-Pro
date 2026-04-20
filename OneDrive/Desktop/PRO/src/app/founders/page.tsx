import Link from 'next/link';

export default function FounderLanding() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border/50 bg-white/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-medium tracking-tight">
                        <span className="font-bold">AlloySphere</span>
                    </Link>
                    <div className="flex items-center gap-5">
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
                        <Link href="/signup/founder" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-xl transition-all hover:bg-primary/90">
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="max-w-5xl mx-auto px-6 py-24">
                    <p className="text-sm font-medium mb-4 text-primary">For Founders</p>
                    <h1 className="text-4xl font-bold tracking-tight mb-4 max-w-lg leading-tight">Build your startup with verified collaborators.</h1>
                    <p className="max-w-md text-muted-foreground text-lg leading-relaxed mb-8">
                        Hire verified talent, manage milestones, sign agreements digitally, and track payments. Everything a serious founder needs.
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                        <Link href="/signup/founder" className="text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-xl transition-all hover:bg-primary/90">
                            Create founder account
                        </Link>
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Already have an account?
                        </Link>
                    </div>
                </section>

                <hr className="border-border/50 max-w-5xl mx-auto" />

                <section className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="text-3xl font-bold tracking-tight mb-10">What founders use AlloySphere for</h2>
                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-10">
                        {[
                            ['Verified talent hiring', 'Every applicant passes identity and skill verification before they can apply to your startup.'],
                            ['Legal agreements', 'Generate NDAs and contracts. Digital signing with immutable audit trails.'],
                            ['Milestone payments', 'Track deliverables and release payments per milestone. Full receipt tracking built in.'],
                            ['Trust scores', 'Every user earns trust through verification, completed work, and collaboration history.'],
                            ['Funding rounds', 'Create and manage funding rounds. Verified investors discover your startup through the platform.'],
                            ['Team management', 'Manage your team, track applications, and coordinate across multiple startups.'],
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
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Start building.</h2>
                    <p className="text-muted-foreground text-lg mb-8">Free to create an account. No credit card required.</p>
                    <Link href="/signup/founder" className="inline-block text-sm font-medium bg-primary text-primary-foreground px-6 py-3 rounded-xl transition-all hover:bg-primary/90">
                        Create founder account
                    </Link>
                </section>
            </main>

            <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} AlloySphere
            </footer>
        </div>
    );
}
