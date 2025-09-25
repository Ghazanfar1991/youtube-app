
import React, { useState, useEffect, useContext } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Wand2, Download, Scissors, Sparkles, Check, ThumbGeniusLogo, Star, Link } from '../components/icons';
import { Twitter, Instagram, Youtube } from '../components/icons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { ToastContext } from '../contexts/ToastContext';
import { Page } from '../App';

interface HomePageProps {
  onGenerate: (prompt: string) => void;
  onExtract: (url: string) => void;
  onNavigate: (page: Page) => void;
}

const LIVE_PREVIEW_ITEMS = [
    {
        prompt: "An astronaut riding a unicorn on the moon, cinematic",
        title: "RIDING A UNICORN ON THE MOON?!",
        imageUrl: "https://picsum.photos/seed/astronaut/512/288"
    },
    {
        prompt: "Close up of a cat wearing sunglasses, vibrant colors",
        title: "This Cat is Cooler Than You",
        imageUrl: "https://picsum.photos/seed/coolcat/512/288"
    },
    {
        prompt: "A neon-lit cyberpunk city street at night",
        title: "Welcome to the FUTURE",
        imageUrl: "https://picsum.photos/seed/cyberpunk/512/288"
    },
    {
        prompt: "Fantasy landscape with floating islands and waterfalls",
        title: "I Found a HIDDEN World!",
        imageUrl: "https://picsum.photos/seed/fantasy/512/288"
    }
];

const LivePreviewCard = () => {
    const [index, setIndex] = useState(0);
    const [displayedPrompt, setDisplayedPrompt] = useState("");
    const [progress, setProgress] = useState(0);
    
    const currentItem = LIVE_PREVIEW_ITEMS[index];
    const { prompt: fullPrompt, title, imageUrl } = currentItem;

    useEffect(() => {
        setDisplayedPrompt('');
        let charIndex = 0;

        const typingInterval = setInterval(() => {
            setDisplayedPrompt(fullPrompt.substring(0, charIndex + 1));
            charIndex++;
            if (charIndex > fullPrompt.length) {
                clearInterval(typingInterval);
            }
        }, 50);

        setProgress(0);
        const progressInterval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return p + 1;
            });
        }, 40);
        
        const cycleTimeout = setTimeout(() => {
            setIndex(prevIndex => (prevIndex + 1) % LIVE_PREVIEW_ITEMS.length);
        }, 5000);

        return () => {
            clearInterval(typingInterval);
            clearInterval(progressInterval);
            clearTimeout(cycleTimeout);
        };
    }, [index, fullPrompt]);

    return (
         <div className="relative bg-white/50 dark:bg-background-dark/50 backdrop-blur-lg p-6 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl shadow-primary/20">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Live AI Preview</h3>
                <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/80 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </div>
                    Generating
                </div>
            </div>
            <div className="aspect-video w-full rounded-lg bg-gray-200 dark:bg-gray-900 mt-4 overflow-hidden relative">
                <img src={imageUrl} alt="Generated thumbnail" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex items-end p-4">
                    <h4 className="text-white text-2xl font-bold leading-tight shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}>
                        {title}
                    </h4>
                </div>
            </div>
            <div className="mt-4">
                <div className="font-mono text-sm h-10 p-2 rounded-md bg-gray-200 dark:bg-gray-900 border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-300 overflow-hidden whitespace-nowrap">
                    {displayedPrompt}
                    {displayedPrompt.length < fullPrompt.length && <span className="animate-ping">_</span>}
                </div>
                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 mt-3 overflow-hidden">
                    <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-black/10 dark:border-white/10 py-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex justify-between items-center w-full text-lg font-semibold text-left text-gray-900 dark:text-white"
            >
                <span>{question}</span>
                <span className={`transform transition-transform duration-300 text-primary ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}
            >
                <p className="pt-4 text-gray-600 dark:text-gray-400">{answer}</p>
            </div>
        </div>
    );
};

const TemplateScroller = () => {
    const templates = Array.from({ length: 12 }, (_, i) => `https://picsum.photos/seed/t${i + 1}/512/288`);
    
    return (
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
            <div className="flex w-[400%] animate-scroll">
                {[...templates, ...templates].map((src, i) => (
                    <div key={i} className="w-[256px] h-[144px] shrink-0 mx-2 rounded-lg overflow-hidden shadow-lg relative bg-gray-200 dark:bg-gray-800 border-2 border-black/10 dark:border-white/10">
                        <img src={src} className="w-full h-full object-cover" alt={`Template ${i % 12 + 1}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                            <p className="text-white text-lg font-bold leading-tight" style={{textShadow: '0 1px 3px rgba(0,0,0,0.7)'}}>YOUR HEADLINE HERE</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const UserReviewsScroller = () => {
    const reviews = [
        { name: "Casey", handle: "@caseyneistat", text: "This is legit the future of thumbnails.", stars: 5, avatar: "https://picsum.photos/seed/r1/40/40" },
        { name: "Jenna", handle: "@jennamarbles", text: "My workflow is so much faster now. Love it!", stars: 5, avatar: "https://picsum.photos/seed/r2/40/40" },
        { name: "Marques", handle: "@mkbhd", text: "The quality is shockingly good. Super clean UI.", stars: 5, avatar: "https://picsum.photos/seed/r3/40/40" },
        { name: "Emma", handle: "@emmachamberlain", text: "OBSESSED. I can finally match my thumbnail to my video's vibe.", stars: 5, avatar: "https://picsum.photos/seed/r4/40/40" },
        { name: "Peter", handle: "@petermckinnon", text: "A powerful tool for any creator looking to level up their visuals.", stars: 5, avatar: "https://picsum.photos/seed/r5/40/40" },
        { name: "Lilly", handle: "@iisuperwomanii", text: "It's like having a graphic designer on call 24/7.", stars: 5, avatar: "https://picsum.photos/seed/r6/40/40" },
    ];
    
    return (
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_5%,white_95%,transparent)]">
            <div className="flex w-[calc(2*6*22rem)] animate-scroll-reviews">
                {[...reviews, ...reviews].map((review, i) => (
                    <div key={i} className="w-80 shrink-0 mx-4 p-6 bg-white/5 dark:bg-background-dark/50 rounded-xl shadow-lg border border-black/10 dark:border-white/10">
                        <div className="flex text-yellow-400">
                            {Array.from({length: review.stars}).map((_, j) => <Star key={j} className="w-5 h-5"/>)}
                        </div>
                        <p className="mt-4 text-gray-600 dark:text-gray-300">&ldquo;{review.text}&rdquo;</p>
                        <div className="mt-4 flex items-center gap-3">
                            <img src={review.avatar} className="w-10 h-10 rounded-full" alt={review.name}/>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">{review.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{review.handle}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HomePage: React.FC<HomePageProps> = ({ onGenerate, onExtract, onNavigate }) => {
    const [prompt, setPrompt] = useState('');
    const [url, setUrl] = useState('');
    const [ctaEmail, setCtaEmail] = useState('');
    const { showToast } = useContext(ToastContext);
  
    const handleGenerateSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (prompt.trim()) {
        onGenerate(prompt);
      }
    };

    const handleExtractSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
          onExtract(url);
        }
    };
    
    const handleSubscribeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ctaEmail.trim() || !/^\S+@\S+\.\S+$/.test(ctaEmail)) {
            showToast({ message: "Please enter a valid email address.", variant: 'destructive' });
            return;
        }

        const mailchimpUrl = "https://gmail.us6.list-manage.com/subscribe/post?u=1cef3766ef227139e3c699e85&id=536a3e4923";
        const formData = new FormData();
        formData.append('EMAIL', ctaEmail);
        // Mailchimp honeypot field
        formData.append('b_1cef3766ef227139e3c699e85_536a3e4923', '');

        try {
            await fetch(mailchimpUrl, {
                method: 'POST',
                body: formData,
                mode: 'no-cors',
            });
            showToast({ message: "Thanks for subscribing!", variant: 'default' });
            setCtaEmail('');
        } catch (error) {
            console.error('Mailchimp subscription error:', error);
            showToast({ message: "Could not subscribe. Please try again later.", variant: 'destructive' });
        }
    };
  
    return (
      <div className="w-full overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative text-center py-20 md:py-32 lg:py-40 overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-white dark:bg-background-dark">
                 <div
                    style={{
                        background: 'radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.08), transparent 40%)',
                    }}
                    className="absolute top-0 left-0 w-full h-full animate-slow-pulse-1"
                />
                 <div
                    style={{
                        background: 'radial-gradient(circle at 80% 90%, rgba(124, 58, 237, 0.15), transparent 50%)',
                    }}
                    className="absolute top-0 left-0 w-full h-full animate-slow-pulse-2"
                />
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-gray-900 dark:text-white animate-in fade-in slide-in-from-bottom-4 duration-1000">
                     <span className="bg-gradient-to-b from-gray-900 to-gray-700 dark:from-gray-50 dark:to-gray-400 bg-clip-text text-transparent">AI Thumbnails in</span> <span className="text-primary">One Click</span>
                </h1>
                <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-gray-600 dark:text-gray-400 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
                    Generate viral YouTube thumbnails that stop the scroll, or extract existing ones for inspiration.
                </p>
                <div className="mt-10 max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                    <Tabs defaultValue="generate">
                        <TabsList className="bg-gray-200/50 dark:bg-gray-900/50 border border-black/10 dark:border-white/10">
                            <TabsTrigger value="generate" className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-600 dark:text-gray-400"><Sparkles className="w-4 h-4 mr-2"/>Generate</TabsTrigger>
                            <TabsTrigger value="extract" className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-600 dark:text-gray-400"><Link className="w-4 h-4 mr-2"/>Extract</TabsTrigger>
                        </TabsList>
                        <TabsContent value="generate">
                            <form onSubmit={handleGenerateSubmit} className="mt-4 flex flex-col sm:flex-row gap-3">
                                <Input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder='e.g., "A robot holding a red skateboard"'
                                    className="flex-grow !h-14 !text-base focus:ring-primary"
                                />
                                <Button type="submit" size="lg" disabled={!prompt.trim()} className="h-14 !text-base !bg-gray-900 dark:!bg-gray-800 text-white ring-2 ring-inset ring-primary/50 hover:ring-primary shadow-lg shadow-primary/20 transition-all duration-300 ease-in-out hover:scale-[1.03] active:scale-95">
                                    Generate Now
                                </Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="extract">
                            <form onSubmit={handleExtractSubmit} className="mt-4 flex flex-col sm:flex-row gap-3">
                                <Input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Paste YouTube video URL..."
                                    className="flex-grow !h-14 !text-base focus:ring-primary"
                                />
                                <Button type="submit" size="lg" disabled={!url.trim()} className="h-14 !text-base !bg-gray-900 dark:!bg-gray-800 text-white ring-2 ring-inset ring-primary/50 hover:ring-primary shadow-lg shadow-primary/20 transition-all duration-300 ease-in-out hover:scale-[1.03] active:scale-95">
                                    Extract Thumbnail
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </section>

        {/* Live Preview */}
        <section className="py-16 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <LivePreviewCard />
            </div>
        </section>

        {/* Features Section */}
        <section className="py-16 sm:py-24 bg-gray-100 dark:bg-background-dark/70">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Everything You Need to Go Viral</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
                        From idea to upload-ready thumbnail in minutes.
                    </p>
                </div>
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center p-8 bg-white dark:bg-gray-900/50 border border-black/10 dark:border-white/10 rounded-xl shadow-lg">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
                            <Wand2 className="h-8 w-8" />
                        </div>
                        <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">AI Generation</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Turn simple text prompts into a dozen unique thumbnail concepts. Find the perfect style for your video.</p>
                    </div>
                    <div className="text-center p-8 bg-white dark:bg-gray-900/50 border border-black/10 dark:border-white/10 rounded-xl shadow-lg">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
                            <Download className="h-8 w-8" />
                        </div>
                        <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">Instant Extraction</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Instantly grab the high-resolution thumbnail from any YouTube video to use as inspiration or a reference.</p>
                    </div>
                    <div className="text-center p-8 bg-white dark:bg-gray-900/50 border border-black/10 dark:border-white/10 rounded-xl shadow-lg">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
                            <Scissors className="h-8 w-8" />
                        </div>
                        <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">Precision Editing</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Refine your generated images with simple text commands. Add text, change colors, or swap backgrounds effortlessly.</p>
                    </div>
                </div>
            </div>
        </section>
        
        {/* How It Works Section */}
        <section className="py-16 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Create in 3 Simple Steps</h2>
                </div>
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div>
                        <div className="text-5xl font-bold text-primary/30">01</div>
                        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Describe Your Idea</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Write a prompt describing the thumbnail you want. Be as simple or detailed as you like.</p>
                    </div>
                    <div>
                        <div className="text-5xl font-bold text-primary/30">02</div>
                        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Generate & Refine</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Our AI provides options. Pick your favorite and use simple prompts to make it perfect.</p>
                    </div>
                    <div>
                        <div className="text-5xl font-bold text-primary/30">03</div>
                        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Download & Upload</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Download your final high-res thumbnail and watch your click-through-rate soar.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Template Gallery */}
        <section className="py-16 sm:py-24">
            <div className="container mx-auto">
                <div className="text-center px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Endless Styles at Your Fingertips</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
                        From minimalist to explosive, our AI is trained on every viral thumbnail style.
                    </p>
                </div>
                <div className="mt-16">
                   <TemplateScroller />
                </div>
            </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 sm:py-24 bg-gray-100 dark:bg-background-dark/70">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                 <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Trusted by Top Creators</h2>
                </div>
                <div className="mt-16">
                    <UserReviewsScroller />
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Simple, Transparent Pricing</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
                        Choose a plan that fits your creative workflow. Cancel anytime.
                    </p>
                </div>
                <div className="mt-16 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 border border-black/10 dark:border-white/10 rounded-xl text-center">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Free</h3>
                        <p className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-white">$0<span className="text-lg font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
                        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">15 credits to start</p>
                    </div>
                    <div className="p-8 border-2 border-primary rounded-xl text-center relative shadow-2xl shadow-primary/20">
                         <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                            Most Popular
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Pro</h3>
                        <p className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-white">$15<span className="text-lg font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
                        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">750 credits/mo</p>
                    </div>
                    <div className="p-8 border border-black/10 dark:border-white/10 rounded-xl text-center">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Max</h3>
                        <p className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-white">$29<span className="text-lg font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
                        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">1,500 credits/mo</p>
                    </div>
                </div>
                <div className="text-center mt-8">
                    <Button size="lg" className="bg-gray-800 text-white dark:bg-gray-200 dark:text-black hover:bg-gray-700 dark:hover:bg-gray-300" onClick={() => onNavigate('pricing')}>
                        View Full Pricing
                    </Button>
                </div>
            </div>
        </section>

        {/* Email CTA */}
        <section className="py-16 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-primary/10 dark:bg-primary/20 rounded-2xl p-10 md:p-16 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Get Ahead of the Algorithm</h2>
                    <p className="mt-4 max-w-xl mx-auto text-lg text-primary-700 dark:text-primary-300">
                        Join our newsletter for the latest AI trends, thumbnail tips, and product updates.
                    </p>
                     <form onSubmit={handleSubscribeSubmit} className="mt-8 max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                        <Input
                            type="email"
                            value={ctaEmail}
                            onChange={(e) => setCtaEmail(e.target.value)}
                            placeholder='Enter your email'
                            className="flex-grow !h-12 !text-base focus:ring-primary"
                        />
                        <Button type="submit" size="lg" className="h-12 !text-base !bg-gray-900 dark:!bg-gray-800 text-white ring-2 ring-inset ring-primary/50 hover:ring-primary shadow-lg shadow-primary/20 transition-all">
                            Subscribe
                        </Button>
                    </form>
                </div>
            </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                 <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Frequently Asked Questions</h2>
                </div>
                <div className="mt-12">
                    <FAQItem
                        question="How do credits work?"
                        answer="Generating or editing a thumbnail costs 1 credit. Extracting an existing thumbnail from a video is free. This simple system lets you experiment without worrying about complex calculations."
                    />
                    <FAQItem
                        question="Can I use the generated images commercially?"
                        answer="Yes, all images you generate are yours to use commercially. You own the copyright to the thumbnails you create on any paid plan."
                    />
                     <FAQItem
                        question="What is the image resolution?"
                        answer="All thumbnails are generated at 1280x720 pixels, the standard resolution for YouTube, ensuring they look crisp and clear on all devices."
                    />
                     <FAQItem
                        question="Can I cancel my plan anytime?"
                        answer="Absolutely. You can cancel your subscription at any time from your account settings. You'll retain access to your plan's features until the end of the billing period."
                    />
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-100 dark:bg-background-dark border-t border-black/10 dark:border-white/10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2">
                           <div className="text-primary size-7">
                                <ThumbGeniusLogo />
                           </div>
                           <span className="font-bold text-xl text-gray-900 dark:text-white">ThumbGenius</span>
                        </div>
                        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">AI-powered thumbnails to boost your views.</p>
                        <div className="mt-6 flex gap-4">
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-primary"><Twitter className="w-5 h-5"/></a>
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-primary"><Instagram className="w-5 h-5"/></a>
                            <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-primary"><Youtube className="w-5 h-5"/></a>
                        </div>
                    </div>
                     <div className="col-span-1 md:col-start-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Product</h4>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('generator'); }} className="text-gray-600 dark:text-gray-400 hover:text-primary">Generator</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('extractor'); }} className="text-gray-600 dark:text-gray-400 hover:text-primary">Extractor</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('pricing'); }} className="text-gray-600 dark:text-gray-400 hover:text-primary">Pricing</a></li>
                        </ul>
                    </div>
                    <div className="col-span-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Legal</h4>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('terms'); }} className="text-gray-600 dark:text-gray-400 hover:text-primary">Terms of Service</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigate('privacy'); }} className="text-gray-600 dark:text-gray-400 hover:text-primary">Privacy Policy</a></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-black/10 dark:border-white/10 text-center text-sm text-gray-500 dark:text-gray-500">
                    &copy; {new Date().getFullYear()} ThumbGenius. All rights reserved.
                </div>
            </div>
        </footer>
      </div>
    );
};

export default HomePage;