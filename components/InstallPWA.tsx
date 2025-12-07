import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // ALWAYS show popup after 2 seconds (for testing and production)
        const timer = setTimeout(() => {
            console.log('✅ Showing install popup');
            setShowInstallButton(true);
        }, 2000);

        // Also listen for the real browser event (for production)
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Real browser install prompt available
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowInstallButton(false);
            }
        } else {
            // Show instructions for manual install
            if (isIOS) {
                alert('📱 To install on iOS:\n\n1. Tap the Share button (□↑)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"\n\nThe app will appear on your home screen!');
            } else {
                alert('📱 To install this app:\n\n1. Tap the menu (⋮) in your browser\n2. Tap "Install app" or "Add to Home screen"\n\nOr deploy to HTTPS (Vercel) for automatic install!');
            }
            setShowInstallButton(false);
        }
    };

    const handleDismiss = () => {
        setShowInstallButton(false);
    };

    if (!showInstallButton) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 max-w-md w-full relative overflow-hidden">
                {/* Decorative Background Blob */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-brand-blue/10 to-brand-orange/10 rounded-b-[50%] -translate-y-1/2 pointer-events-none"></div>

                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center relative z-10 mt-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-orange flex items-center justify-center shadow-lg mb-6 rotate-3 hover:rotate-6 transition-transform">
                        <Download size={40} className="text-white" />
                    </div>

                    <h2 className="text-2xl font-black text-slate-800 mb-2">Download App</h2>
                    <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                        Get the best experience! Download the Squadran app for faster access, offline mode, and smoother performance.
                    </p>

                    <button
                        onClick={handleInstallClick}
                        className="w-full py-4 bg-brand-dark text-white rounded-xl font-bold text-lg hover:bg-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mb-3"
                    >
                        <Download size={20} /> Download App
                    </button>

                    <button
                        onClick={handleDismiss}
                        className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPWA;
