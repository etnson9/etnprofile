import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    addDoc, 
    collection, 
    getDoc, 
    setLogLevel 
} from 'firebase/firestore';
import { 
    Copy, UploadCloud, Eye, Image as ImageIcon, Loader2, X, 
    Globe, Code, DollarSign, Zap, User, Users, Music 
} from 'lucide-react';

// --- Global Variables (Mandatory Contextual Variables) ---
// Development Fallback Configuration for hosting outside of Canvas
const DEV_FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY", // REPLACE WITH YOUR KEY
    authDomain: "YOUR_FIREBASE_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_FIREBASE_PROJECT_ID",
    storageBucket: "YOUR_FIREBASE_PROJECT_ID.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'etn-profile-dev';
const firebaseConfig = typeof __firebase_config !== 'undefined' && Object.keys(JSON.parse(__firebase_config)).length > 0
    ? JSON.parse(__firebase_config)
    : DEV_FIREBASE_CONFIG;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

// --- Firebase Initialization and Services ---
let firebaseApp;
let db;
let auth;
let authInitialized = false;

try {
    if (Object.keys(firebaseConfig).length > 0 && firebaseConfig.projectId !== "YOUR_FIREBASE_PROJECT_ID") {
        setLogLevel('debug');
        firebaseApp = initializeApp(firebaseConfig);
        db = getFirestore(firebaseApp);
        auth = getAuth(firebaseApp);
        authInitialized = true;
    } else {
        console.warn("Using placeholder Firebase configuration. Data persistence will not work until real keys are provided.");
    }
} catch (e) {
    console.error("Firebase Initialization Failed:", e);
}


// --- Utility Functions ---

/**
 * Converts a File object (image) into a Base64 data URL string.
 */
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

/**
 * Custom hook for generating a sword sound effect using Web Audio API.
 */
const useSwordSfx = () => {
    const playSwordSfx = useCallback(() => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();

            // Simple noise burst mimicking a sharp metallic sound/sword slash
            const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 seconds
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                const decay = 1 - (i / bufferSize);
                data[i] = (Math.random() * 2 - 1) * decay * (i > bufferSize * 0.1 ? 1 : i / (bufferSize * 0.1));
            }

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = "highpass";
            filter.frequency.setValueAtTime(4000, audioCtx.currentTime); 
            
            source.connect(filter);
            filter.connect(audioCtx.destination);
            
            source.start();
        } catch (error) {
            console.error("Audio playback error:", error);
        }
    }, []);

    return { playSwordSfx };
};

// --- Custom Components ---

/**
 * Renders the full-screen image viewer based on the URL parameter.
 */
const ImageViewer = ({ imageId, db, setViewMode }) => {
    const [imageData, setImageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const publicCollectionPath = `artifacts/${appId}/public/data/shared_images`;

    useEffect(() => {
        if (!db || !imageId) {
            setError('Database or Image ID is missing.');
            setIsLoading(false);
            return;
        }

        const fetchImage = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const imageRef = doc(db, publicCollectionPath, imageId);
                const docSnap = await getDoc(imageRef);

                if (docSnap.exists()) {
                    setImageData(docSnap.data().base64);
                } else {
                    setError(`Image not found with ID: ${imageId}. It may have been purged.`);
                }
            } catch (e) {
                console.error("Error fetching image:", e);
                setError('Failed to load image data. Connection issue?');
            } finally {
                setIsLoading(false);
            }
        };
        // Only attempt fetch if Firebase services are available
        if (authInitialized) {
            fetchImage();
        } else {
             setError("Service unavailable. Firebase not configured.");
             setIsLoading(false);
        }
    }, [imageId, db, publicCollectionPath]);

    const handleClose = () => {
        // Remove the view parameter from the URL
        const newUrl = window.location.href.split('?')[0];
        window.history.pushState({}, document.title, newUrl);
        setViewMode('profile'); // Switch back to the main profile
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#070707] text-white p-4 z-[999]">
                <Loader2 className="w-12 h-12 text-red-400 animate-spin" />
                <p className="mt-4 text-xl font-bold text-red-300">Summoning image from the ether...</p>
                <p className="text-sm text-gray-400 mt-2">ID: {imageId}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#070707] text-white p-6 z-[999]">
                <X className="w-16 h-16 text-red-500" />
                <h2 className="text-3xl font-cinzel font-bold mt-4 text-red-400">Error of Destiny</h2>
                <p className="mt-4 text-lg text-red-300 text-center">{error}</p>
                <button 
                    onClick={handleClose}
                    className="mt-8 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white font-semibold transition shadow-md shadow-red-900/50"
                >
                    Return to Profile
                </button>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-[#070707] flex flex-col items-center justify-center p-4 z-[999]">
            <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-3 bg-red-600 hover:bg-red-700 rounded-full text-white transition shadow-xl z-50 flex items-center space-x-2"
            >
                <X className="w-6 h-6" />
                <span className="hidden sm:inline font-semibold">Close Viewer</span>
            </button>
            <div className="relative max-w-full max-h-full">
                <img 
                    src={imageData} 
                    alt={`Shared Image ID: ${imageId}`} 
                    className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl shadow-red-900/50 border-4 border-red-700"
                />
            </div>
        </div>
    );
};


/**
 * Image Uploader Interface.
 */
const ImageUploader = ({ isAuthReady, db }) => {
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [shareableUrl, setShareableUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { playSwordSfx } = useSwordSfx();

    const publicCollectionPath = `artifacts/${appId}/public/data/shared_images`;
    const TARGET_DOMAIN_URL = 'https://etn.lol/'; 

    const handleUpload = async () => {
        playSwordSfx();
        if (!file) {
            setUploadStatus('Please select an image file to upload.');
            return;
        }
        if (!isAuthReady || !db || !authInitialized) {
            setUploadStatus('Error: Service not ready. Check connection and Firebase configuration.');
            return;
        }
        
        setUploadStatus('');
        setShareableUrl('');
        setIsLoading(true);

        try {
            const base64Data = await fileToBase64(file);
            setUploadStatus('Image encoded. Saving to cloud...');

            // Implement exponential backoff for Firestore addDoc
            const MAX_RETRIES = 5;
            let lastError = null;
            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    const newDocRef = await addDoc(collection(db, publicCollectionPath), {
                        base64: base64Data,
                        filename: file.name,
                        uploadedAt: new Date().toISOString(),
                        ownerId: auth.currentUser?.uid || 'anonymous',
                        mimeType: file.type,
                    });
                    
                    const docId = newDocRef.id;
                    const newShareableUrl = `${TARGET_DOMAIN_URL}?view=${docId}`;
                    setShareableUrl(newShareableUrl);
                    setUploadStatus('Success! Image is now shareable on etn.lol.');
                    lastError = null; // Clear error on success
                    break; // Exit loop on success

                } catch (error) {
                    lastError = error;
                    if (i < MAX_RETRIES - 1) {
                        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s, 8s, 16s
                        setUploadStatus(`Upload failed, retrying in ${delay / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            if (lastError) {
                throw lastError; // Re-throw the last error if all retries failed
            }

        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus(`Upload failed: ${error.message.substring(0, 80)}...`);
        } finally {
            setIsLoading(false);
            setFile(null); // Clear file input
            document.getElementById('image-file-input').value = '';
        }
    };
    
    const handleCopy = () => {
        playSwordSfx();
        if (shareableUrl) {
            const tempInput = document.createElement('textarea');
            tempInput.value = shareableUrl;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            setUploadStatus('URL copied to clipboard!');
            setTimeout(() => setUploadStatus(''), 2000);
        }
    };
    
    return (
        <div className="animate-fadeIn p-4 sm:p-8 max-w-4xl w-full mx-auto">
            <h1 className="text-4xl sm:text-5xl font-cinzel font-extrabold text-red-500 mb-2 border-b-2 border-red-700 pb-2">
                <ImageIcon className="w-8 h-8 mr-2 inline-block -mt-2" />
                // Image Host Portal
            </h1>
            <p className="text-gray-300 text-lg mb-6 border-l-4 border-red-700 pl-3">
                Upload your digital fragment and weave it into the Threads of Destiny. Links are generated for **etn.lol** and are publicly viewable.
            </p>

            {/* Upload Area */}
            <div className="space-y-4 mb-6 p-6 border border-red-800 rounded-xl bg-gray-900 shadow-inner shadow-black/50">
                <input
                    type="file"
                    id="image-file-input"
                    accept="image/*"
                    onChange={(e) => {
                        setFile(e.target.files[0]);
                        setShareableUrl('');
                        setUploadStatus(e.target.files[0] ? `File selected: ${e.target.files[0].name}` : '');
                    }}
                    className="w-full text-base text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-base file:font-bold file:bg-red-700 file:text-white hover:file:bg-red-600 cursor-pointer transition file:shadow-md file:shadow-red-900/50"
                />
                
                <button
                    onClick={handleUpload}
                    disabled={!file || isLoading || !isAuthReady || !authInitialized}
                    className={`w-full py-3 rounded-xl text-white font-bold transition duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-red-800/40 ${
                        !file || isLoading || !isAuthReady || !authInitialized ? 'bg-gray-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/60 transform hover:scale-[1.01]'
                    }`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Forging Destiny...</span>
                        </>
                    ) : (
                        <>
                            <UploadCloud className="w-6 h-6" />
                            <span>Forge Shareable Link (etn.lol)</span>
                        </>
                    )}
                </button>

                <p className={`text-base font-semibold ${shareableUrl ? 'text-green-400' : 'text-yellow-400'} min-h-[1.5rem]`}>
                    {uploadStatus}
                </p>
            </div>

            {/* Shareable URL Output */}
            {shareableUrl && (
                <div className="mt-8 p-5 bg-gray-800 rounded-xl border border-red-500/50 space-y-3 shadow-2xl">
                    <p className="text-red-400 font-bold flex items-center text-lg">
                        <Eye className="w-6 h-6 mr-3" />
                        Link of Fate:
                    </p>
                    <div className="flex bg-gray-900 rounded-lg overflow-hidden border border-red-700/50">
                        <input
                            type="text"
                            readOnly
                            value={shareableUrl}
                            className="flex-1 p-3 text-base text-gray-200 bg-transparent truncate font-mono"
                        />
                        <button
                            onClick={handleCopy}
                            className="p-3 bg-red-600 hover:bg-red-700 text-white transition duration-200 flex items-center space-x-2 font-bold"
                        >
                            <Copy className="w-5 h-5" />
                            <span className="hidden sm:inline">Copy</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Profile Components ---

/**
 * Main Profile Content
 */
const ProfileContent = ({ activeTab, setActiveTab, playSwordSfx }) => {
    
    const coreTenets = [
        { name: 'FAST', emoji: '⚡️', description: 'Zero-latency execution. Every millisecond secured.' },
        { name: 'DISCRETE', emoji: '👻', description: 'Operate in the shadows. Complete anonymity guaranteed.' },
        { name: 'UNTRACKABLE', emoji: '🛰️', description: 'Beyond the gaze of all surveillance. Ghost in the machine.' },
        { name: 'UNBANNABLE', emoji: '🛡️', description: 'Systems designed for absolute resilience against detection.' },
        { name: 'EVOLVING', emoji: '♾️', description: 'The code is always learning, adapting, and conquering.' },
    ];

    // Payment Logic
    const paymentMethods = [
        { name: 'BTC', address: 'bc1q22hmdy35ck278rdq376ynx0846xwgf289xg8vn', icon: '₿', type: 'copy' },
        { name: 'LTC', address: 'LbjXnR5cA5DLoJ1LSgSnVa4CCdFzbngptQ', icon: 'Ł', type: 'copy' },
        { name: 'SOL', address: 'GptR8TrPw8R1ChmRfJLyDS3ihnRa8V2t3ZMbLWf6aZBZ', icon: '◎', type: 'copy' },
        { name: 'ETH', address: '0x2390eb79E0436EcE58E6c171F1E0400e08AA1201', icon: 'Ξ', type: 'copy' },
        { name: 'PayPal', address: 'https://www.paypal.com/ncp/payment/E57JDEF7FM28C', icon: 'P', type: 'link' },
    ];

    const handlePaymentAction = (method) => {
        playSwordSfx();
        if (method.type === 'copy') {
            const tempInput = document.createElement('textarea');
            tempInput.value = method.address;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            console.log(`${method.name} address copied!`);
        } else if (method.type === 'link') {
            window.open(method.address, '_blank');
        }
    };
    
    // Tab Content Switch
    let content;
    switch (activeTab) {
        case 'profile':
            content = (
                <div className="animate-fadeIn space-y-12">
                    
                    {/* CORE TENETS (UPDATED AND CONSTRAINED) */}
                    <section>
                        <h2 className="text-3xl font-cinzel font-bold text-red-500 mb-6 border-b-2 border-red-800 pb-2">CORE TENETS</h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {coreTenets.map((tenet, index) => (
                                <div key={index} className="glaze-box p-4 text-center rounded-xl border border-red-700/70 bg-gray-900/60 hover:bg-gray-800 transition duration-300 shadow-lg shadow-black/50">
                                    <p className="text-4xl mb-2">{tenet.emoji}</p>
                                    <p className="font-extrabold text-xl text-red-400 tracking-wider mb-2">{tenet.name}</p>
                                    {/* Updated description text styling to ensure it fits: text-xs */}
                                    <p className="text-xs text-gray-400 italic leading-snug break-words">{tenet.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* PRODUCTS */}
                    <section id="products">
                        <h2 className="text-3xl font-cinzel font-bold text-red-500 mb-6 border-b-2 border-red-800 pb-2">PRODUCTS</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <ProductCard 
                                title="ETNBOT" 
                                description="This is ETNBOT, the world's best nitro sniper, forged for speed and secrecy. A true digital weapon."
                                buttonText="View Details"
                                link="https://hoster1-p26cx6enm-seirtspids-projects.vercel.app/etnbot_sniper_thread_design.html"
                                playSwordSfx={playSwordSfx}
                            />
                            <ProductCard title="COMING SOON" description="The next shadow project is in development, focusing on decentralized identity." isPlaceholder={true} />
                            <ProductCard title="COMING SOON" description="A new digital weapon awaits creation, codenamed 'Phantom'." isPlaceholder={true} />
                        </div>
                    </section>

                    {/* SOUNDTRACK */}
                    <section id="soundtrack-section"> {/* ADDED ID FOR SCROLLING */}
                        <h2 className="text-3xl font-cinzel font-bold text-red-500 mb-6 border-b-2 border-red-800 pb-2">SOUNDTRACK OF FATE</h2>
                        <div className="rounded-xl overflow-hidden shadow-2xl shadow-red-900/70 border border-red-700">
                            <iframe 
                                src="https://open.spotify.com/embed/playlist/7ASHXx9Hah5saHxR92tUS5?utm_source=generator&theme=0" 
                                width="100%" 
                                height="380" 
                                frameBorder="0" 
                                allowFullScreen="" 
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                loading="lazy"
                                title="Spotify Playlist Embed"
                                className="border-0"
                            ></iframe>
                        </div>
                    </section>
                </div>
            );
            break;

        case 'wallets':
            content = (
                <div className="animate-fadeIn p-4 sm:p-0">
                    <h2 className="text-3xl font-cinzel font-bold text-red-500 mb-8 border-b-2 border-red-800 pb-2">CRYPTO WALLETS & PAYPAL</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paymentMethods.map((method, index) => (
                            <PaymentCard
                                key={index}
                                method={method}
                                onAction={handlePaymentAction}
                            />
                        ))}
                    </div>
                </div>
            );
            break;
            
        case 'discord':
            content = (
                <div className="animate-fadeIn flex flex-col items-center justify-center p-10 bg-gray-900/70 rounded-xl border-2 border-red-800 shadow-2xl shadow-red-900/50">
                    <Users className="w-16 h-16 text-red-500 mb-6 pulse-red" />
                    <h2 className="text-4xl font-cinzel font-bold text-white mb-6 text-center">JOIN THE DISCORD!</h2>
                    <a 
                        href="https://www.discord.gg/1ncel" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={playSwordSfx}
                        className="w-full sm:w-96 py-4 bg-[#5865F2] text-white text-xl font-bold rounded-xl flex items-center justify-center space-x-3 transition duration-300 transform hover:scale-105 shadow-xl hover:shadow-[#5865F2]/60 border border-blue-400"
                    >
                        <Globe className="w-6 h-6" />
                        <span>ENTER THE DOMAIN</span>
                    </a>
                </div>
            );
            break;
        
        case 'hoster':
             const isAuthReady = authInitialized; 
             content = <ImageUploader isAuthReady={isAuthReady} db={db} />;
             break;

        default:
            content = <div className="text-red-500 text-center py-10">Select a tab to view content.</div>;
    }

    return (
        <main className="lg:col-span-3 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                {/* WELCOME BANNER (GIF) */}
                <div className="relative h-40 sm:h-64 bg-black rounded-xl overflow-hidden shadow-2xl shadow-red-900/70 border-4 border-red-700/70 mb-10">
                    {/* The Gif Embed */}
                    <div className="relative w-full h-full banner-gif-wrapper">
                        <div className="tenor-gif-embed" data-postid="12587464080199064649" data-share-method="host" data-aspect-ratio="1.31053" data-width="100%">
                            <a href="https://tenor.com/view/berserk-guts-realayax-ayax-ayaz-gif-12587464080199064649">Berserk Guts GIF</a>
                        </div> 
                        {/* Tenor script is loaded globally in App component */}
                    </div>
                </div>

                {/* BIO SECTION */}
                <section className="mb-10 p-6 bg-gray-900/70 backdrop-blur-sm rounded-xl border border-red-800 shadow-2xl shadow-black/60">
                    <h2 className="text-2xl font-cinzel font-bold text-red-400 mb-4 border-b-2 border-red-900 pb-1">THE STRUGGLER'S MANIFESTO</h2>
                    <p className="text-gray-300 text-lg mb-4 leading-relaxed">
                        I am an architect of digital domains, a dedicated **Website Developer** and **Software Developer** who thrives on forging resilient systems from the ground up. My focus is on creating **robust, high-performance engines** and dynamic user interfaces that feel intuitive and powerful. Whether I'm optimizing a backend's efficiency or meticulously perfecting a frontend component, my passion lies in bringing complex digital ideas to vibrant, functional life.
                    </p>
                    <ul className="text-base text-gray-400 flex flex-wrap gap-x-4">
                        <li className="font-bold text-red-300">Core Languages:</li>
                        {['C++', 'Python', 'HTML', 'JavaScript', 'React', 'Firebase'].map((lang, index) => (
                            <li key={index} className="border-r border-red-900 pr-4 last:border-r-0 last:pr-0">{lang}</li>
                        ))}
                    </ul>
                </section>
                
                {content}
            </div>
        </main>
    );
};

// --- Sub Components ---

const ProductCard = ({ title, description, buttonText, link, isPlaceholder, playSwordSfx }) => {
    return (
        <div className={`p-5 rounded-xl border-2 transition duration-300 ${
            isPlaceholder 
                ? 'bg-gray-800 border-gray-700 text-gray-500 opacity-60' 
                : 'bg-gray-900 border-red-700 text-gray-300 shadow-xl shadow-red-900/30 hover:border-red-500'
        } transform hover:scale-[1.01]'}`}>
            <h3 className="text-xl font-cinzel font-bold mb-2 tracking-wide text-red-400">{title}</h3>
            <p className="text-base mb-4">{description}</p>
            {!isPlaceholder && (
                <a 
                    href={link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={playSwordSfx}
                    className="inline-block px-5 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300 shadow-lg hover:shadow-red-500/50"
                >
                    {buttonText}
                </a>
            )}
        </div>
    );
};

const PaymentCard = ({ method, onAction }) => {
    const isLink = method.type === 'link';
    
    return (
        <div className="bg-gray-900/70 p-5 rounded-xl border-2 border-red-800 shadow-xl shadow-black/60 flex flex-col transition duration-300 hover:bg-gray-800 hover:border-red-600">
            <div className="flex items-center space-x-3 mb-3">
                <div className="text-4xl font-serif font-black text-red-400">{method.icon}</div>
                <h3 className="text-2xl font-cinzel font-bold text-white">{method.name}</h3>
            </div>
            <p className="text-sm text-gray-400 truncate mb-4 font-mono">{isLink ? method.address.split('/').slice(0, 3).join('/') : method.address}</p>
            <button
                onClick={() => onAction(method)}
                className={`mt-auto w-full py-2.5 rounded-lg text-base font-bold transition duration-200 shadow-md ${
                    isLink 
                        ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-500/50'
                        : 'bg-red-800 text-red-100 hover:bg-red-700 hover:shadow-red-500/50'
                }`}
            >
                {isLink ? 'VISIT LINK' : 'COPY ADDRESS'}
            </button>
        </div>
    );
};

// --- Main App ---

const App = () => {
    // State for Firebase Auth/DB
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    // State for Tab Management
    const [activeTab, setActiveTab] = useState('profile');
    
    // State for Rickroll Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // State for URL Parameter based Viewer Mode
    const [imageId, setImageId] = useState(null);

    // Custom Hooks
    const { playSwordSfx } = useSwordSfx();

    // 1. Initialization, Authentication, and URL Check
    useEffect(() => {
        // --- Authentication ---
        if (authInitialized && auth) {
            const authenticate = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                    setIsAuthReady(true);
                } catch (e) {
                    console.error("Authentication failed:", e);
                    setIsAuthReady(false);
                }
            };
            authenticate();
        }

        // --- URL Parameter Check for Viewer Mode ---
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('view');
        if (id) {
            setImageId(id);
        } else {
            setImageId(null);
        }
        
        // --- Load Tenor Embed Script ---
        const loadTenorScript = () => {
             if (document.getElementById('tenor-embed-script')) return;
             const script = document.createElement('script');
             script.id = 'tenor-embed-script';
             script.type = 'text/javascript';
             script.async = true;
             script.src = 'https://tenor.com/embed.js';
             document.body.appendChild(script);
        };
        loadTenorScript();
        
    }, []); // Runs once on mount

    // If in Viewer Mode, render only the viewer
    if (imageId && authInitialized) {
        return <ImageViewer imageId={imageId} db={db} setViewMode={setActiveTab} />;
    }
    
    // Handle tab change, optional anchor scroll, and SFX
    const handleTabChange = (tabName, anchorId = null) => { 
        playSwordSfx();
        
        // If the user clicks on Products or Soundtrack, switch to 'profile' and scroll
        const targetTab = ['products', 'soundtrack'].includes(tabName) ? 'profile' : tabName;
        setActiveTab(targetTab);

        if (anchorId) {
            // Add a slight delay to ensure the DOM has updated and the fade-in is starting
            setTimeout(() => {
                const element = document.getElementById(anchorId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100); 
        }
    };

    // Handle Rickroll
    const handleInitiateConnection = () => {
        playSwordSfx();
        setIsModalOpen(true);
    };

    // --- Cursor & Global Styles ---
    useEffect(() => {
        // Custom Cursors logic
        document.body.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><path fill=\'none\' stroke=\'#E70000\' stroke-width=\'2\' d=\'M16 4v24M4 16h24\'/><circle fill=\'#E70000\' r=\'1\' cx=\'16\' cy=\'16\'/></svg>"), auto';
        
        const handleMouseMove = (e) => {
            const hoveredElement = e.target.closest('a, button, [data-interactive="true"]');
            if (hoveredElement) {
                document.body.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle fill=\'#FF0000\' r=\'5\' cx=\'16\' cy=\'16\' opacity=\'0.8\'/></svg>"), pointer';
            } else {
                document.body.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><path fill=\'none\' stroke=\'#E70000\' stroke-width=\'2\' d=\'M16 4v24M4 16h24\'/><circle fill=\'#E70000\' r=\'1\' cx=\'16\' cy=\'16\'/></svg>"), auto';
            }
        };

        const handleClick = () => {
             document.body.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><path fill=\'none\' stroke=\'#FF0000\' stroke-width=\'3\' d=\'M16 0v32M0 16h32\'/><circle fill=\'none\' stroke=\'#FF0000\' stroke-width=\'3\' r=\'10\' cx=\'16\' cy=\'16\'/></svg>"), pointer';
             setTimeout(() => {
                 document.body.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><path fill=\'none\' stroke=\'#E70000\' stroke-width=\'2\' d=\'M16 4v24M4 16h24\'/><circle fill=\'#E70000\' r=\'1\' cx=\'16\' cy=\'16\'/></svg>"), auto';
             }, 100);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mousedown', handleClick);
        
        // Tailwind/Custom styles injection
        document.body.className = 'min-h-screen bg-gray-950 font-inter antialiased';
        document.head.insertAdjacentHTML('beforeend', `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@300;400;700;900&display=swap');
                .font-cinzel { font-family: 'Cinzel', serif; }
                .font-inter { font-family: 'Inter', sans-serif; }
                
                /* Increased Base Text Size for Normal Content */
                p, li { font-size: 1.125rem; /* text-lg */ line-height: 1.75; } 
                
                .sidebar-nav-item {
                    transition: all 0.2s ease-in-out;
                    filter: drop-shadow(0 0 2px #8B0000);
                }
                .sidebar-nav-item:hover {
                    transform: scale(1.03);
                    filter: drop-shadow(0 0 8px #FF0000) blur(0.5px);
                }
                .glaze-box:hover {
                    box-shadow: 0 0 15px rgba(139, 0, 0, 0.7);
                    transform: translateY(-2px);
                    transition: all 0.3s ease-in-out;
                    filter: blur(0.1px);
                }
                @keyframes pulse-red {
                    0%, 100% { box-shadow: 0 0 10px #FF0000, 0 0 5px #8B0000 inset; }
                    50% { box-shadow: 0 0 20px #FF0000, 0 0 10px #8B0000 inset; }
                }
                .pulse-red { animation: pulse-red 2s infinite alternate; }
                
                /* GIF Sizing Fixes for Tenor */
                .profile-gif-wrapper .tenor-gif-embed {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                .profile-gif-wrapper iframe {
                    width: 120% !important; 
                    height: 120% !important;
                    position: absolute;
                    top: -10% !important; 
                    left: -10% !important;
                    object-fit: cover;
                }
                .banner-gif-wrapper .tenor-gif-embed {
                    width: 100%;
                    height: 100%;
                }
                .banner-gif-wrapper iframe {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out;
                }
            </style>
        `);
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mousedown', handleClick);
        };
    }, []);

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-gray-950 text-white">
            {/* SIDEBAR (Profile and Navigation) */}
            <aside className="w-full lg:w-80 bg-black p-6 shadow-2xl shadow-red-900/40 border-r-4 border-red-900 sticky top-0 z-10">
                <div className="flex flex-col items-center">
                    
                    {/* PROFILE GIF (Branded Logo) */}
                    <div className="w-32 h-32 bg-black rounded-full border-4 border-red-700 pulse-red overflow-hidden relative mb-4 profile-gif-wrapper">
                        <div className="tenor-gif-embed" data-postid="5769121116284891944" data-share-method="host" data-aspect-ratio="0.9" data-width="100%">
                            <a href="https://tenor.com/view/berserk-gif-5769121116284891944">Berserk GIF</a>
                        </div> 
                    </div>

                    <h1 className="text-3xl font-cinzel font-black text-red-500 tracking-wider">ETNS PROFILE</h1>
                    <p className="text-lg text-gray-400 mt-1">THE STRUGGLER</p>

                    <button 
                        onClick={handleInitiateConnection}
                        className="mt-6 w-full py-3 bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-900/60 transition duration-300 transform hover:scale-[1.02] hover:bg-red-600"
                    >
                        INITIATE CONNECTION
                    </button>
                </div>

                {/* Navigation Links (UPDATED FOR PRODUCTS/SOUNDTRACK SCROLL) */}
                <nav className="mt-10 space-y-4">
                    <NavItem icon={Zap} label="PROFILE NEXUS" tabName="profile" activeTab={activeTab} onClick={handleTabChange} />
                    <NavItem icon={Code} label="PRODUCTS" tabName="products" anchorId="products" activeTab={activeTab} onClick={handleTabChange} />
                    <NavItem icon={Music} label="SOUNDTRACK" tabName="soundtrack" anchorId="soundtrack-section" activeTab={activeTab} onClick={handleTabChange} />
                    <NavItem icon={ImageIcon} label="IMAGE HOSTER" tabName="hoster" activeTab={activeTab} onClick={handleTabChange} />
                    <NavItem icon={DollarSign} label="CRYPTO WALLETS & PAYPAL" tabName="wallets" activeTab={activeTab} onClick={handleTabChange} />
                    <NavItem icon={Users} label="JOIN THE DISCORD!" tabName="discord" activeTab={activeTab} onClick={handleTabChange} />
                </nav>
                
                <div className="mt-8 pt-4 border-t border-red-900">
                     <p className="text-xs text-gray-600">User ID: <span className="text-gray-500 font-mono break-all">{auth?.currentUser?.uid || 'Authenticating...'}</span></p>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <ProfileContent 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                playSwordSfx={playSwordSfx}
            />
            
            {/* RICKROLL MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="p-8 bg-gray-900 rounded-xl border-4 border-red-700 shadow-2xl shadow-red-900/70">
                    <h2 className="text-3xl font-cinzel font-bold text-red-500 mb-4 border-b border-red-800 pb-2">CONNECTION ESTABLISHED</h2>
                    <div className="relative w-full aspect-video min-w-[300px] sm:min-w-[560px]">
                         <iframe 
                            width="560" 
                            height="315" 
                            src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&controls=0&mute=0&rel=0&showinfo=0&iv_load_policy=3&enablejsapi=1&widgetid=1" 
                            title="YouTube video player" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen 
                            className="w-full h-full rounded-lg"
                        ></iframe>
                    </div>
                    <p className="text-lg text-gray-400 mt-4 text-center">Protocol 404: Never Gonna Give You Up</p>
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="mt-6 w-full py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
                    >
                        CLOSE WINDOW
                    </button>
                </div>
            </Modal>
        </div>
    );
};

// --- Reusable Navigation Item Component (UPDATED) ---
const NavItem = ({ icon: Icon, label, tabName, anchorId = null, activeTab, onClick }) => {
    // Treat 'products' and 'soundtrack' as active if 'profile' is active, but only highlight if the tab name matches
    const isActive = activeTab === tabName || (['products', 'soundtrack'].includes(tabName) && activeTab === 'profile');
    
    return (
        <button
            onClick={() => onClick(tabName, anchorId)}
            data-interactive="true"
            className={`sidebar-nav-item w-full flex items-center p-3 rounded-xl transition duration-200 text-left font-bold tracking-wider ${
                isActive 
                    ? 'bg-red-800 text-white shadow-inner shadow-black/50 border border-red-600'
                    : 'text-gray-400 hover:bg-gray-900/50 hover:text-red-300'
            }`}
        >
            <Icon className="w-5 h-5 mr-3" />
            {label}
        </button>
    );
};

// --- Reusable Modal Component ---
const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

export default App;
