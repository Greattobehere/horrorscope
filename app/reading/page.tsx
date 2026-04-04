"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import PortraitCrossfade from "../components/PortraitCrossfade";
import ShareCard from "../components/ShareCard";

export default function ReadingPage()
export default function ReadingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [fateMessage, setFateMessage] = useState("");
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const [sliders, setSliders] = useState({
    love: 5,
    wealth: 5,
    health: 5,
    fame: 5,
    wisdom: 5,
  });

  const searchParams = useSearchParams();
  const querySign = searchParams?.get("sign") ?? "";
  const [sign, setSign] = useState<string>(querySign || "");

  useEffect(() => {
    const storedSign = typeof window !== "undefined" ? localStorage.getItem("horrorscope-sign") : "";
    const normalizedQuerySign = querySign?.toLowerCase() || "";

    if (normalizedQuerySign) {
      setSign(normalizedQuerySign);
      if (typeof window !== "undefined") {
        localStorage.setItem("horrorscope-sign", normalizedQuerySign);
      }
    } else if (storedSign) {
      setSign(storedSign.toLowerCase());
    }
  }, [querySign]);

  const signLabel = sign ? sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase() : "Scorpio";

  const crossfadeBurnRef = useRef({ i: 0, r: 0, e: 0 });
  const burnRAF = useRef<number | null>(null);

  const setCSSBurnVars = (i: number, r: number, e: number) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--burnI", i.toString());
      document.documentElement.style.setProperty("--burnR", r.toString());
      document.documentElement.style.setProperty("--burnE", e.toString());
    }
  };

  useEffect(() => {
    const tick = () => {
      const nextI = Math.max(0, crossfadeBurnRef.current.i - 0.02);
      const nextR = Math.max(0, crossfadeBurnRef.current.r - 0.015);
      const nextE = Math.max(0, crossfadeBurnRef.current.e - 0.01);
      crossfadeBurnRef.current = { i: nextI, r: nextR, e: nextE };
      setCSSBurnVars(nextI, nextR, nextE);
      burnRAF.current = requestAnimationFrame(tick);
    };

    burnRAF.current = requestAnimationFrame(tick);
    return () => {
      if (burnRAF.current) cancelAnimationFrame(burnRAF.current);
    };
  }, []);

  const computeOmenScore = (values: {
    love: number;
    wealth: number;
    health: number;
    fame: number;
    wisdom: number;
  }) => {
    const avg = (values.love + values.wealth + values.health + values.fame + values.wisdom) / 5;
    return Math.round((avg / 10) * 100);
  };

  const omenScore = computeOmenScore(sliders);

  const SIGN_READINGS: Record<
    string,
    { brightSide: string; horrorMirror: string }
  > = {
    aries: {
      brightSide: `Oh Aries, today your fire is magnetic. You will charm a cashier with a joke and then immediately forget your card, but who cares — adventure has now RSVP'd to your life.`,
      horrorMirror: `Aries, you thought you could skip the meeting, but your boss just typed 'can we talk' into Slack in all caps. Your epic streak of “I got this” ends with you taking the team victory lap in the next brainstorm humiliation arena.`,
    },
    taurus: {
      brightSide: `Taurus, your comfort priorities are paying off. Your coffee tastes like success and your savings account is low-key flexing. Keep it cozy, keep it sure, and maybe finish that to-do list you’ve been gently ignoring.`,
      horrorMirror: `Taurus, your two-hour nap turned into a 26-hour sleep coma. Your fridge feels betrayed. The universe draft-marks your “passive resistance” into a responsibility avalanche, and you’ll watch the shoelace incident in HD.`,
    },
    gemini: {
      brightSide: `Gemini, your duality is delightful. You’ve got a new meme rotation ready and one contact thinks you’re a visionary while another thinks you’re a serial texter. Both are absolutely right.`,
      horrorMirror: `Gemini, you post one opinion and 87 people ask you to clarify immediately. In your own mind you’re debating whether the idea is genius or cringe — and the algorithm does neither.`,
    },
    cancer: {
      brightSide: `Cancer, your empathy is your superpower. A stranger may cry in your grocery checkout line, and you’ll hand them a tiny tissue like a hero. Their gratitude becomes your warm glow for the rest of the week.`,
      horrorMirror: `Cancer, your home vibes are endangered. One passive-aggressive sock complaint turns into a full house civil trial. You’ll cry, then rewrite the apology email, then cry again watching the apology email to the apology email.`,
    },
    leo: {
      brightSide: `Leo, the spotlight has your name on it today. You walk into a room and the background music changes in your honor. Own it, laugh loudly, and make someone else feel famous by accident.`,
      horrorMirror: `Leo, your selfie game is strong except for the one screenshot your ex still has from 2019. Today it resurfaces in an unflattering PDF at work. The horror is not the photo, it’s the caption you wrote at 2 a.m.`,
    },
    virgo: {
      brightSide: `Virgo, your checklist is a masterpiece that someone else will accidentally steal. You’ll fix a typo no one knew existed and silently take a victory sip of water.`,
      horrorMirror: `Virgo, the cosmos coordinates a first date that runs exactly 12 minutes too long for your patience. You will analyze everyone’s grammar. You will regret nothing.`,
    },
    libra: {
      brightSide: `Libra, balance is your aesthetic. You will coach two friends through a decision while flawlessly calibrating your own mood palette. The universe applauds your diplomatic boss energy.`,
      horrorMirror: `Libra, that 9-page pros/cons spreadsheet you made for a sandwich is about to be exposed by your critique-hungry roommate. Your peace treaty becomes a courtroom drama at 11 p.m.`,
    },
    scorpio: {
      brightSide: `Scorpio, your intensity is an art form. Today is for quiet conspiracies, secret kindness, and the sneaky victory of watching doubt become regret in someone who underestimated you.`,
      horrorMirror: `Oh, Scorpio. We need to discuss the grudge. The one from 2019. Today it will resurface at the worst possible moment — specifically during a meeting where someone uses an identical tone of voice to the original offender. You will hold it together. But your left eye will twitch exactly once. Everyone will notice. No one will say anything. They know.`,
    },
    sagittarius: {
      brightSide: `Sagittarius, curiosity is your passport. You’ll say “yes” to something wild and afterwards realize you’ve actually learned one useful thing and ten hilarious one-liners.`,
      horrorMirror: `Sagittarius, your “I can do five things at once” energy blows up in a good way, then collapses into a fantasy-operated instant noodle incident. Your optimism might click the smoke alarm for attention.`,
    },
    capricorn: {
      brightSide: `Capricorn, your grind is stylish. Every productivity tool trembles if it does not contain your name. Rejoice in your tiny wins; they are real and terrifyingly effective.`,
      horrorMirror: `Capricorn, you finally accepted an invitation to relax. It lasted 7 minutes before you checked your email and accidentally forwarded the to-do list with “plan urgent” to the person responsible for chores.`,
    },
    aquarius: {
      brightSide: `Aquarius, your idea bubble is glittering. You will invent a new ritual involving 3 candles and one spreadsheet, and someone will call you a genius misfit in the best way.`,
      horrorMirror: `Aquarius, your big idea is now a minor scandal because you forgot to mention the 14 people you alienated while pursuing it. You’ll half-apologize via meme and fully regret not bringing snacks.`,
    },
    pisces: {
      brightSide: `Pisces, your imagination is a refuge and a rocket ship. You will write a beautiful message that makes someone weep with gratitude, and then get lost in the clouds for an hour.`,
      horrorMirror: `Pisces, your dream voicemail turned eerie when you accidentally sent it to your boss. It contains 70% stardust and 30% existential whispers. HR will be confused.`,
    },
  };

  const currentSign = sign.toLowerCase() || "scorpio";
  const signReading = SIGN_READINGS[currentSign] || SIGN_READINGS["scorpio"];

  const brightSideText = signReading.brightSide;
  const horrorMirrorText = signReading.horrorMirror;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSliderChange = (key: string, value: number) => {
    setSliders((prev) => ({ ...prev, [key]: value }));
    // Trigger burn-glow when a slider changes
    crossfadeBurnRef.current = {
      i: 1,
      r: 1,
      e: 1,
    };
  };

  const [showFate, setShowFate] = useState(false);

  const handleRewriteFate = () => {
    const traits = [
      sliders.love > 7 ? "generous" : "jealous",
      sliders.wealth > 7 ? "secure" : "scrappy",
      sliders.health > 7 ? "vital" : "frazzled",
      sliders.fame > 7 ? "iconic" : "low-key",
      sliders.wisdom > 7 ? "sage" : "clueless",
    ];

    const doomIndex = Math.min(4, Math.floor(omenScore / 20));
    const bandName = doomIndex === 0 ? "Doomed" : doomIndex === 1 ? "Troubled" : doomIndex === 2 ? "Uncertain" : doomIndex === 3 ? "Promising" : "Blessed";

    const fateMessagesPerBand: Record<number, string[]> = {
      0: [
        `Doomed, ${signLabel}. Your pulse is a haunted metronome, and the only thing growing faster than your anxiety is your willingness to laugh as the abyss takes notes.`,
        `The stars say: You turned 'threat level red' into an art project. Today, the universe will gift you one terrifyingly accurate reminder that ghost stories are just job security for your nightmares.`,
        `If fate were a meme, you'd be the GIF that auto-repeats in slow motion. The darkest jokes are about the ones who still think they can leave early.`,
      ],
      1: [
        `Troubled, ${signLabel}. You’re balancing on a rope that is definitely judgmental. Expect a surprise with the tone of 'remember when you swore you'd change?' and the consequences of ignoring that inner cat voice.`,
        `Witty warning: Your current choices are like adding glitter to a broken spell. It looks cute, but cleanup is still going to take forever.`,
        `The cosmos says: Your dreams are valuable, but your timing is a little 3 a.m. text message, so brace for deliciously awkward payback.`,
      ],
      2: [
        `Uncertain, ${signLabel}. You are teetering between “strategic genius” and “please help”. The universe can’t decide either; it’s sending random clues disguised as reuseable memes.`,
        `You are at 50/50 luck, like choosing the right line at 7-11. One more push and you get a free coffee. One less and you get stale chips.`,
        `Teasing fate: You’re in the middle of a plot twist that will either make you unapologetically smug or delightfully humble. Pick your side with style.`,
      ],
      3: [
        `Promising, ${signLabel}. Your choices are generating quiet miracles: someone hears the perfect joke at the perfect time, and the universe will give you a nod you can feel in your bones.`,
        `Warmly, your path is bright enough to cast soft gold shadows. Today’s omen is a perfectly brewed cup of confidence.`,
        `Your stars are smiling. Expect the sort of small wins that taste like champagne and make your past self high-five you from the good habits aisle.`,
      ],
      4: [
        `Blessed, ${signLabel}! The cosmos is serving you fireworks with a side of empowerment. Your future is basically an influencer caption that's too good to be true.`,
        `Ecstatic energy: you're on a roll so smooth the universe forgot to pause for plot twists. Enjoy your victory lap, you earned it with grace and a little insane courage.`,
        `Over-the-top: The gods are taking notes on your manifesting ability. Today’s blessings are delivered by a choir of lucky puppies and complimentary velvet ropes.`,
      ],
    };

    const fateArray = fateMessagesPerBand[doomIndex];
    const randomFate = fateArray[Math.floor(Math.random() * fateArray.length)];

    setFateMessage(`${bandName} ${omenScore} | ${randomFate}`);
    setShowFate(false);
    setTimeout(() => setShowFate(true), 10);
  };

  const handleShare = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Failed to copy to clipboard");
    }
  };

  const handleShareFate = async () => {
    try {
      if (!fateMessage) {
        return;
      }
      setIsSharing(true);
      setShareStatus("Generating...");

      // Render the ShareCard in hidden DOM
      if (shareCardRef.current) {
        const dataUrl = await toPng(shareCardRef.current, { cacheBust: true });
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `horrorscope-fate-${Date.now()}.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "HorrorScope Fate",
            text: fateMessage,
          });
          setShareStatus("Shared!");
        } else {
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = `horrorscope-fate-${Date.now()}.png`;
          link.click();
          setShareStatus("Downloaded!");
        }
      }

      await navigator.clipboard.writeText(fateMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      setShareStatus("Failed. Copied text only.");
      try {
        await navigator.clipboard.writeText(fateMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback
      }
    } finally {
      setIsSharing(false);
      setTimeout(() => setShareStatus(""), 2000);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B14] text-[#F2EEF7] flex items-center justify-center px-4">
        <style>{`
          @keyframes pulse-gold {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(227, 184, 75, 0.7);
            }
            50% {
              box-shadow: 0 0 0 20px rgba(227, 184, 75, 0);
            }
          }
          .pulse-border {
            animation: pulse-gold 2s infinite;
          }
        `}</style>
        <div className="text-center">
          <div className="pulse-border border-4 border-[#E3B84B] rounded-lg p-8 w-96 h-96 flex items-center justify-center mb-8">
            <img src="/assets/moira-cheerful.png" alt="Moira the fortune teller" style={{width: "280px", height: "auto"}} />
          </div>
          <h2 className="font-serif text-3xl font-bold" style={{ color: "#E3B84B" }}>
            Moira is consulting the stars...
          </h2>
          <p className="text-[#D4C5F9] mt-4">Your reading awaits, dear {signLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B14] text-[#F2EEF7] py-12 px-4 md:px-8">
      <style>{`
        @keyframes screen-flicker {
          0%, 100% { opacity: 1; }
          10% { opacity: 0.95; }
          20% { opacity: 1; }
          30% { opacity: 0.92; }
          40% { opacity: 1; }
        }
        .flicker {
          animation: screen-flicker 0.5s infinite;
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl font-bold mb-2" style={{ color: "#E3B84B" }}>
            Your HorrorScope Reading
          </h1>
          <p className="text-[#D4C5F9] text-lg">{signLabel} - Part {currentPart} of 3</p>
        </div>

        {/* PART 1: The Bright Side */}
        {currentPart === 1 && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="border-4 border-[#E3B84B] rounded-lg p-6 h-96 flex items-center justify-center">
                <img src="/assets/moira-cheerful.png" alt="Moira the fortune teller" style={{width: "280px", height: "auto"}} />
              </div>

              <div className="bg-[#1A1A2E] border-2 border-[#E3B84B] rounded-lg p-8">
                <h2 className="font-serif text-4xl font-bold mb-6" style={{ color: "#E3B84B" }}>
                  The Bright Side
                </h2>
                <p className="text-[#D4C5F9] leading-relaxed text-lg mb-8">{brightSideText}</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleShare(brightSideText)}
                    className="px-6 py-2 bg-[#E3B84B]/20 text-[#E3B84B] rounded-lg hover:bg-[#E3B84B]/30 transition font-semibold"
                  >
                    {copied ? "✓ Copied!" : "Share"}
                  </button>
                  <button
                    onClick={() => setCurrentPart(2)}
                    className="flex-1 px-8 py-3 bg-[#E3B84B] text-[#0B0B14] rounded-lg hover:opacity-90 transition font-semibold"
                  >
                    Continue to the Horror Mirror →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PART 2: The Horror Mirror */}
        {currentPart === 2 && (
          <div className="space-y-8">
            <style>{`
              @keyframes screen-flicker {
                0%, 100% { opacity: 1; }
                10% { opacity: 0.95; }
                20% { opacity: 1; }
                30% { opacity: 0.92; }
                40% { opacity: 1; }
              }
              .flicker {
                animation: screen-flicker 0.5s infinite;
              }
            `}</style>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="flicker border-4 rounded-lg p-6 h-96 flex items-center justify-center" style={{ borderColor: "#2EE59D" }}>
                <img src="/assets/witch-moira.png" alt="Witch Moira" style={{width: "280px", height: "auto"}} />
              </div>

              <div className="bg-[#1A1A2E] rounded-lg p-8" style={{ borderColor: "#2EE59D", borderWidth: "2px" }}>
                <h2 className="font-serif text-4xl font-bold mb-6" style={{ color: "#2EE59D" }}>
                  The Horror Mirror
                </h2>
                <p className="text-[#D4C5F9] leading-relaxed text-lg mb-8">{horrorMirrorText}</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleShare(horrorMirrorText)}
                    className="px-6 py-2 rounded-lg hover:opacity-80 transition font-semibold"
                    style={{
                      backgroundColor: "#2EE59D/20",
                      color: "#2EE59D",
                    }}
                  >
                    {copied ? "✓ Copied!" : "Share"}
                  </button>
                  <button
                    onClick={() => setCurrentPart(3)}
                    className="flex-1 px-8 py-3 rounded-lg hover:opacity-90 transition font-semibold"
                    style={{
                      backgroundColor: "#2EE59D",
                      color: "#0B0B14",
                    }}
                  >
                    Change Your Fate →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PART 3: Change Your Fate */}
        {currentPart === 3 && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
              <div className="border-4 border-[#E3B84B] rounded-lg p-6 h-96">
                <PortraitCrossfade
                  sliders={sliders}
                  isControlled={true}
                  className="h-full w-full object-cover object-top"
                />
                <p className="mt-3 text-sm text-[#D4C5F9]/80">
                  Omen Score: {omenScore}
                </p>
              </div>

              <div className="bg-[#1A1A2E] border-2 border-[#E3B84B] rounded-lg p-8">
                <h2 className="font-serif text-4xl font-bold mb-6" style={{ color: "#E3B84B" }}>
                  Rewrite Your Destiny
                </h2>
                <p className="text-[#D4C5F9] mb-6">
                  Where do you stand on these cosmic scales? Your choices reshape your fate.
                </p>

                <div className="space-y-6">
                  {/* Slider 1 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Love
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.love}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.love}
                      onChange={(e) => handleSliderChange("love", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Playful heart</span>
                      <span>Full on soulmate mode</span>
                    </div>
                  </div>

                  {/* Slider 2 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Wealth
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.wealth}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.wealth}
                      onChange={(e) => handleSliderChange("wealth", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Living on ramen dreams</span>
                      <span>Caviar future plans</span>
                    </div>
                  </div>

                  {/* Slider 3 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Health
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.health}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.health}
                      onChange={(e) => handleSliderChange("health", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Energy slump</span>
                      <span>Yoga-challenge champion</span>
                    </div>
                  </div>

                  {/* Slider 4 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Fame
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.fame}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.fame}
                      onChange={(e) => handleSliderChange("fame", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Wallflower mode</span>
                      <span>Center stage aura</span>
                    </div>
                  </div>

                  {/* Slider 5 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="font-serif text-sm font-bold" style={{ color: "#E3B84B" }}>
                        Wisdom
                      </label>
                      <span className="text-[#D4C5F9]">{sliders.wisdom}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sliders.wisdom}
                      onChange={(e) => handleSliderChange("wisdom", parseInt(e.target.value))}
                      className="w-full h-2 bg-[#0B0B14] rounded-lg appearance-none cursor-pointer accent-[#E3B84B]"
                    />
                    <div className="flex justify-between text-xs text-[#D4C5F9] mt-1">
                      <span>Blindly repeating memes</span>
                      <span>Ancient seer energy</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleRewriteFate}
                    className="flex-1 px-8 py-3 bg-[#E3B84B] text-[#0B0B14] rounded-lg hover:opacity-90 transition font-semibold"
                  >
                    Change Your Fate
                  </button>
                  <button
                    onClick={handleShareFate}
                    disabled={!fateMessage || isSharing}
                    className="flex-1 px-8 py-3 bg-[#E3B84B]/20 text-[#E3B84B] rounded-lg hover:bg-[#E3B84B]/30 transition font-semibold disabled:opacity-40"
                  >
                    {isSharing ? "Generating..." : copied ? "✓ Copied!" : "Share Your Fate"}
                  </button>
                </div>
                {shareStatus && <div className="text-xs text-[#D4C5F9]/80 mt-2">{shareStatus}</div>}
              </div>
            </div>

            {fateMessage && (
              <div
                className={`bg-[#1A1A2E] border-2 border-[#E3B84B] rounded-lg p-8 transition-opacity duration-500 ${
                  showFate ? "opacity-100" : "opacity-0"
                }`}
              >
                <p className="text-[#D4C5F9] text-lg leading-relaxed">{fateMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-[#E3B84B]/20">
          <button
            onClick={() => setCurrentPart(Math.max(1, currentPart - 1))}
            disabled={currentPart === 1}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              currentPart === 1
                ? "bg-[#E3B84B]/20 text-[#D4C5F9]/50 cursor-not-allowed"
                : "bg-[#E3B84B]/20 text-[#E3B84B] hover:bg-[#E3B84B]/30"
            }`}
          >
            ← Back
          </button>

          <a
            href="/"
            className="text-[#D4C5F9] hover:text-[#E3B84B] transition font-semibold"
          >
            ← Return Home
          </a>
        </div>

        <div
          ref={shareCardRef}
          style={{
            position: "fixed",
            top: "-9999px",
            left: "-9999px",
            width: "1200px",
            height: "630px",
            opacity: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <ShareCard signLabel={signLabel} omenScore={omenScore} quote={fateMessage || "Your future awaits..."} />
        </div>
      </div>
    </div>
  );
}

