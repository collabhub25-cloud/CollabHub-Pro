'use client';

import Link from 'next/link';

export default function InvestorLanding() {
    return (
        <div className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
            <header className="border-b border-[#1E293B]">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-semibold tracking-wide text-white">Collab·Hub</Link>
                    <div className="flex items-center gap-5">
                        <Link href="/login" className="text-sm text-[#94A3B8] hover:text-white">Sign in</Link>
                        <Link href="/signup/investor" className="text-sm font-medium bg-[#1FA463] text-white px-3.5 py-2 rounded-md hover:bg-[#1B9157] transition-colors">
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
                    <p className="text-sm text-[#1FA463] font-medium mb-4">For Investors</p>
                    <h1 className="text-white mb-4 max-w-xl">Verified deal flow. Transparent risk.</h1>
                    <p className="text-[#94A3B8] max-w-lg mb-8" style={{ fontSize: '16px', lineHeight: '1.7' }}>
                        Invest in trust-verified startups. Every founder passes KYC. Every agreement is signed on-platform. Every risk factor is visible.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/signup/investor" className="text-sm font-medium bg-[#1FA463] text-white px-4 py-2.5 rounded-md hover:bg-[#1B9157] transition-colors">
                            Create investor account
                        </Link>
                        <Link href="/login" className="text-sm text-[#94A3B8] hover:text-white">
                            Already have an account?
                        </Link>
                    </div>
                </section>

                <hr className="border-[#1E293B] max-w-5xl mx-auto" />

                <section className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="text-white mb-8">What investors use CollabHub for</h2>
                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-6">
                        <div>
                            <p className="font-medium text-white mb-1">Verified deal flow</p>
                            <p className="text-sm text-[#94A3B8]">Browse startups with verified founders, transparent trust scores, and documented team composition.</p>
                        </div>
                        <div>
                            <p className="font-medium text-white mb-1">Accreditation controls</p>
                            <p className="text-sm text-[#94A3B8]">Only Level 3 verified investors can invest. Protects both sides of every transaction.</p>
                        </div>
                        <div>
                            <p className="font-medium text-white mb-1">Due diligence tools</p>
                            <p className="text-sm text-[#94A3B8]">Request access to documents, review milestone history, and audit team performance before committing.</p>
                        </div>
                        <div>
                            <p className="font-medium text-white mb-1">Risk transparency</p>
                            <p className="text-sm text-[#94A3B8]">Trust scores, dispute records, and agreement history — all visible before you write a check.</p>
                        </div>
                        <div>
                            <p className="font-medium text-white mb-1">Portfolio tracking</p>
                            <p className="text-sm text-[#94A3B8]">Track equity positions, investment amounts, and startup performance from one dashboard.</p>
                        </div>
                        <div>
                            <p className="font-medium text-white mb-1">Legal agreements</p>
                            <p className="text-sm text-[#94A3B8]">Every investment is backed by a digitally signed agreement with an immutable audit trail.</p>
                        </div>
                    </div>
                </section>

                <hr className="border-[#1E293B] max-w-5xl mx-auto" />

                <section className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="text-white mb-3">Start your due diligence.</h2>
                    <p className="text-[#94A3B8] mb-6" style={{ fontSize: '15px' }}>Free to create an account. Browse startups before investing.</p>
                    <Link href="/signup/investor" className="text-sm font-medium bg-[#1FA463] text-white px-4 py-2.5 rounded-md hover:bg-[#1B9157] transition-colors">
                        Create investor account
                    </Link>
                </section>
            </main>

            <footer className="border-t border-[#1E293B] py-5 text-center text-sm text-[#475569]">
                © {new Date().getFullYear()} CollabHub
            </footer>
        </div>
    );
}
