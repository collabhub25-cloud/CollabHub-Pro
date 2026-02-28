'use client';

import Link from 'next/link';

export default function TalentLanding() {
    return (
        <div className="min-h-screen bg-white text-[#111827]">
            <header className="border-b border-[#E5E7EB]">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-semibold tracking-wide">Collab·Hub</Link>
                    <div className="flex items-center gap-5">
                        <Link href="/login" className="text-sm text-[#6B7280] hover:text-[#111827]">Sign in</Link>
                        <Link href="/signup/talent" className="text-sm font-medium bg-[#6D33D6] text-white px-3.5 py-2 rounded-md hover:bg-[#5F2BBF] transition-colors">
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
                    <p className="text-sm text-[#6D33D6] font-medium mb-4">For Talent</p>
                    <h1 className="mb-4 max-w-xl">Work with verified founders. Get paid per milestone.</h1>
                    <p className="text-[#6B7280] max-w-lg mb-8" style={{ fontSize: '16px', lineHeight: '1.7' }}>
                        Join startups that have passed verification. Every engagement starts with a signed agreement. Every payment is tracked and transparent.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/signup/talent" className="text-sm font-medium bg-[#6D33D6] text-white px-4 py-2.5 rounded-md hover:bg-[#5F2BBF] transition-colors">
                            Create talent account
                        </Link>
                        <Link href="/login" className="text-sm text-[#6B7280] hover:text-[#111827]">
                            Already have an account?
                        </Link>
                    </div>
                </section>

                <hr className="border-[#E5E7EB] max-w-5xl mx-auto" />

                <section className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="mb-8">What talent uses CollabHub for</h2>
                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-6">
                        <div>
                            <p className="font-medium mb-1">Verified startups</p>
                            <p className="text-sm text-[#6B7280]">Only apply to startups with verified founders. Trust scores and KYC status are visible upfront.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Milestone payments</p>
                            <p className="text-sm text-[#6B7280]">Get paid per deliverable. Payment tracking and receipt management built into the platform.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Skill verification</p>
                            <p className="text-sm text-[#6B7280]">Complete assessments to earn verified skill badges. Stand out to founders looking for specific expertise.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Legal protection</p>
                            <p className="text-sm text-[#6B7280]">Every engagement starts with a signed agreement. Dispute resolution is built in.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Trust score</p>
                            <p className="text-sm text-[#6B7280]">Build your professional reputation through completed milestones, signed agreements, and verified credentials.</p>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Direct messaging</p>
                            <p className="text-sm text-[#6B7280]">Communicate with founders directly through the platform. No external tools needed.</p>
                        </div>
                    </div>
                </section>

                <hr className="border-[#E5E7EB] max-w-5xl mx-auto" />

                <section className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="mb-3">Start building your profile.</h2>
                    <p className="text-[#6B7280] mb-6" style={{ fontSize: '15px' }}>Free to join. Apply to verified startups immediately.</p>
                    <Link href="/signup/talent" className="text-sm font-medium bg-[#6D33D6] text-white px-4 py-2.5 rounded-md hover:bg-[#5F2BBF] transition-colors">
                        Create talent account
                    </Link>
                </section>
            </main>

            <footer className="border-t border-[#E5E7EB] py-5 text-center text-sm text-[#9CA3AF]">
                © {new Date().getFullYear()} CollabHub
            </footer>
        </div>
    );
}
