'use client';

import Link from 'next/link';

export default function FounderLanding() {
    return (
        <div className="min-h-screen bg-white text-[#111827]">
            <header className="border-b border-[#E5E7EB]">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-semibold tracking-wide">Collab·Hub</Link>
                    <div className="flex items-center gap-5">
                        <Link href="/login" className="text-sm text-[#6B7280] hover:text-[#111827]">Sign in</Link>
                        <Link href="/signup/founder" className="text-sm font-medium bg-[#2B5FD9] text-white px-3.5 py-2 rounded-md hover:bg-[#2451C0] transition-colors">
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero — left-aligned, calm */}
                <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
                    <p className="text-sm text-[#2B5FD9] font-medium mb-4">For Founders</p>
                    <h1 className="mb-4 max-w-xl">Build your startup with verified collaborators.</h1>
                    <p className="text-[#6B7280] max-w-lg mb-8" style={{ fontSize: '16px', lineHeight: '1.7' }}>
                        Hire verified talent, manage milestones, sign agreements digitally, and track payments. Everything a serious founder needs — nothing extra.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/signup/founder" className="text-sm font-medium bg-[#2B5FD9] text-white px-4 py-2.5 rounded-md hover:bg-[#2451C0] transition-colors">
                            Create founder account
                        </Link>
                        <Link href="/login" className="text-sm text-[#6B7280] hover:text-[#111827]">
                            Already have an account?
                        </Link>
                    </div>
                </section>

                <hr className="border-[#E5E7EB] max-w-5xl mx-auto" />

                {/* What you get — simple list, not feature cards */}
                <section className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="mb-8">What founders use CollabHub for</h2>
                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-6">
                        <div>
                            <p className="font-medium mb-1">Verified talent hiring</p>
                            <p className="text-sm text-[#6B7280]">Every applicant passes identity and skill verification before they can apply to your startup.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Legal agreements</p>
                            <p className="text-sm text-[#6B7280]">Generate NDAs and contracts. Digital signing with immutable audit trails.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Milestone payments</p>
                            <p className="text-sm text-[#6B7280]">Track deliverables and release payments per milestone. Full receipt tracking built in.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Trust scores</p>
                            <p className="text-sm text-[#6B7280]">Every user earns trust through verification, completed work, and collaboration history.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Funding rounds</p>
                            <p className="text-sm text-[#6B7280]">Create and manage funding rounds. Verified investors discover your startup through the platform.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Team management</p>
                            <p className="text-sm text-[#6B7280]">Manage your team, track applications, and coordinate across multiple startups.</p>
                        </div>
                    </div>
                </section>

                <hr className="border-[#E5E7EB] max-w-5xl mx-auto" />

                {/* Bottom CTA — understated */}
                <section className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="mb-3">Start building.</h2>
                    <p className="text-[#6B7280] mb-6" style={{ fontSize: '15px' }}>Free to create an account. No credit card required.</p>
                    <Link href="/signup/founder" className="text-sm font-medium bg-[#2B5FD9] text-white px-4 py-2.5 rounded-md hover:bg-[#2451C0] transition-colors">
                        Create founder account
                    </Link>
                </section>
            </main>

            <footer className="border-t border-[#E5E7EB] py-5 text-center text-sm text-[#9CA3AF]">
                © {new Date().getFullYear()} CollabHub
            </footer>
        </div>
    );
}
