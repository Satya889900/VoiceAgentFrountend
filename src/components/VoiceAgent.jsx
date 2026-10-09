import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  Square,
  Send,
  Sparkles,
  Settings,
  Bot,
  User,
  Clock,
  Coins,
  Paperclip,
  MessageSquare,
  Activity
} from 'lucide-react';
import { getApiUrl } from '../config/api';

export default function VoiceAgent({ personas = [], onSessionUpdate }) {
  const [session, setSession] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState('gemini_assistant');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Browser speech support check (Chrome/Edge = full support; Firefox/iOS Safari = limited)
  const speechSupported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

  // Mutable refs to prevent stale closure issues in speech callbacks
  const sessionRef = useRef(null);
  const isCallActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isMutedRef = useRef(false);

  const recognitionRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const typeIntervalRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const speechStartTimeRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const latestSpokenTextRef = useRef('');
  const accumulatedFinalsRef = useRef(''); // Buffer for ALL final chunks in one utterance
  const isSendingRef = useRef(false);
  const lastSentTextRef = useRef('');
  const lastSentTimeRef = useRef(0);

  // Keep refs synchronized
  useEffect(() => {
    sessionRef.current = session;
    isCallActiveRef.current = Boolean(session && session.status === 'active');
  }, [session]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isThinkingRef.current = isThinking;
  }, [isThinking]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Auto scroll transcript whenever transcript, interim text, or thinking state changes
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText, isThinking]);

  // Call duration timer
  useEffect(() => {
    if (session && session.status === 'active') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCallActiveRef.current = false;
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Safe auto-restart for SpeechRecognition loop
  const scheduleListeningRestart = (delay = 250) => {
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);

    restartTimeoutRef.current = setTimeout(() => {
      if (
        isCallActiveRef.current &&
        !isMutedRef.current &&
        !isSpeakingRef.current &&
        !isThinkingRef.current &&
        !isListeningRef.current
      ) {
        startListening();
      }
    }, delay);
  };

  // Start Call
  const handleStartCall = async () => {
    setError(null);
    setIsMuted(false);
    isMutedRef.current = false;
    setIsConnecting(true);

    try {
      const res = await fetch(getApiUrl('/api/sessions/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: selectedPersona,
          customSystemPrompt: selectedPersona === 'custom' ? customPrompt : undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to create session');
      const newSession = await res.json();
      setSession(newSession);
      sessionRef.current = newSession;
      isCallActiveRef.current = true;
      setTranscript([]);
      setCallDuration(0);
      if (onSessionUpdate) onSessionUpdate(newSession);

      // Immediately activate continuous listening loop
      startListening();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // End Call
  const handleEndCall = async () => {
    isCallActiveRef.current = false;
    stopListening();
    handleInterrupt();

    const activeId = sessionRef.current?.id;
    if (!activeId) return;

    try {
      const res = await fetch(getApiUrl(`/api/sessions/${activeId}/end`), {
        method: 'POST',
      });
      if (res.ok) {
        const ended = await res.json();
        setSession(ended);
        sessionRef.current = ended;
        if (onSessionUpdate) onSessionUpdate(ended);
      }
    } catch (err) {
      console.warn('Error ending session:', err);
    }
  };

  // Interrupt / Barge-in: stops speech audio and typing animation immediately
  const handleInterrupt = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (typeIntervalRef.current) {
      clearInterval(typeIntervalRef.current);
      typeIntervalRef.current = null;
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  };

  // Real-Time Typewriter "Agent Write" Effect + TTS Speech
  const streamAgentResponse = (fullText, audioOutputSeconds) => {
    handleInterrupt();
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    // Add empty agent message container into transcript
    const msgId = Date.now();
    const newAgentMsg = {
      id: msgId,
      role: 'agent',
      text: '',
      fullText,
      timestamp: new Date().toISOString(),
      audioSeconds: audioOutputSeconds,
    };

    setTranscript((prev) => [...prev, newAgentMsg]);

    // Words streaming typewriter effect
    const words = fullText.split(' ');
    let currentWordIndex = 0;

    // Approximate typing speed to match spoken voice rate (~4-5 words/sec => ~200-240ms per word)
    const typeDelay = Math.max(80, Math.min(220, Math.floor((audioOutputSeconds * 1000) / (words.length || 1))));

    typeIntervalRef.current = setInterval(() => {
      currentWordIndex++;
      const currentDisplayed = words.slice(0, currentWordIndex).join(' ');

      setTranscript((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: currentDisplayed } : m))
      );

      if (currentWordIndex >= words.length) {
        clearInterval(typeIntervalRef.current);
        typeIntervalRef.current = null;
      }
    }, typeDelay);

    // Speak via browser TTS
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.name.includes('Google') || v.name.includes('Natural') || v.lang.startsWith('en')
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        // Turn off mic completely while speaking to prevent self-echo
        stopListening();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        isSendingRef.current = false;
        // Ensure complete text is displayed
        setTranscript((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: fullText } : m))
        );
        // Turn-taking: wait 600ms acoustic grace period to let room echo dissipate
        scheduleListeningRestart(600);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        isSendingRef.current = false;
        scheduleListeningRestart(600);
      };

      // Anchor to global window to avoid Chrome GC bug & resume audio pipeline
      window._currentVoiceUtterance = utterance;
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {}
      window.speechSynthesis.speak(utterance);
    } else {
      // If no speech synthesis supported, auto-resume after typing finishes
      setTimeout(() => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        scheduleListeningRestart(200);
      }, audioOutputSeconds * 1000);
    }
  };

  // Single entry point for user utterances (prevents duplicate triggers & echo)
  const handleFinalUtterance = (text) => {
    if (!text || text.trim().length < 2) return;
    if (isSendingRef.current || isThinkingRef.current || isSpeakingRef.current) return;

    const clean = text.trim();

    // Suppress duplicate speech recognized within 3.5 seconds
    if (
      clean.toLowerCase() === lastSentTextRef.current.toLowerCase() &&
      Date.now() - lastSentTimeRef.current < 3500
    ) {
      console.log('Suppressed duplicate utterance:', clean);
      accumulatedFinalsRef.current = '';
      return;
    }

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    latestSpokenTextRef.current = '';
    accumulatedFinalsRef.current = ''; // Reset buffer after sending
    setInterimText('');

    // Force stop recognition before sending to avoid microphone capturing trailing frames
    stopListening();

    const durationSec = Math.max(1, Math.round((Date.now() - (speechStartTimeRef.current || Date.now())) / 1000));
    sendMessage(clean, durationSec);
  };

  // Continuous SpeechRecognition Setup
  const startListening = () => {
    if (
      !isCallActiveRef.current ||
      isMutedRef.current ||
      isSpeakingRef.current ||
      isThinkingRef.current ||
      isSendingRef.current
    ) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech Recognition is not supported in this browser. Use text chat below.');
      return;
    }

    // If already running, don't restart — let it keep going
    if (isListeningRef.current && recognitionRef.current) {
      return;
    }

    // Abort stale instance cleanly only if NOT currently listening
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // English script — works for Hinglish too

      speechStartTimeRef.current = Date.now();
      accumulatedFinalsRef.current = ''; // Fresh buffer for new listening session

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setError(null);
      };

      recognition.onresult = (event) => {
        // Discard any incoming audio frames if agent is talking, thinking, or already sending
        if (isSpeakingRef.current || isThinkingRef.current || isSendingRef.current) {
          return;
        }

        let interim = '';
        let newFinals = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            newFinals += item[0].transcript + ' ';
          } else {
            interim += item[0].transcript;
          }
        }

        // User spoke while agent was active -> barge-in
        if (isSpeakingRef.current) {
          handleInterrupt();
          return;
        }

        // Accumulate finals into buffer — NEVER send just a partial chunk
        if (newFinals.trim()) {
          accumulatedFinalsRef.current = (accumulatedFinalsRef.current + ' ' + newFinals).trim();
          // Update interim to show accumulated text while they keep speaking
          setInterimText(accumulatedFinalsRef.current + (interim ? ' ' + interim : ''));
        } else if (interim) {
          setInterimText((accumulatedFinalsRef.current + ' ' + interim).trim());
        }

        // Reset silence timer on any speech activity
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Only fire after 1800ms of real silence — enough for natural pauses in speech
        const candidateText = (accumulatedFinalsRef.current || interim).trim();
        if (candidateText) {
          silenceTimerRef.current = setTimeout(() => {
            const finalCandidate = accumulatedFinalsRef.current.trim() || latestSpokenTextRef.current.trim();
            if (finalCandidate) {
              handleFinalUtterance(finalCandidate);
            }
          }, 1800);
        }

        if (interim) {
          latestSpokenTextRef.current = (accumulatedFinalsRef.current + ' ' + interim).trim();
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('SpeechRecognition error:', event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
        // Keep-alive loop: restart only if call is active and everything is completely idle
        if (
          isCallActiveRef.current &&
          !isMutedRef.current &&
          !isSpeakingRef.current &&
          !isThinkingRef.current &&
          !isSendingRef.current
        ) {
          scheduleListeningRestart(200);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      isListeningRef.current = false;
      scheduleListeningRestart(600);
    }
  };

  const stopListening = () => {
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
    isListeningRef.current = false;
    setInterimText('');
    latestSpokenTextRef.current = '';
    // Don't reset accumulatedFinalsRef here — it will be sent via handleFinalUtterance
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      isMutedRef.current = false;
      scheduleListeningRestart(100);
    } else {
      setIsMuted(true);
      isMutedRef.current = true;
      stopListening();
    }
  };

  // Send message to backend Gemini API (atomic lock prevents double-sending)
  const sendMessage = async (userText, audioInputSeconds = 2) => {
    const activeSession = sessionRef.current;
    if (!activeSession || !userText || !userText.trim()) return;

    // Prevent duplicate send if already in-flight or thinking
    if (isSendingRef.current || isThinkingRef.current) {
      console.log('Ignored concurrent/duplicate sendMessage call');
      return;
    }

    isSendingRef.current = true;
    lastSentTextRef.current = userText.trim();
    lastSentTimeRef.current = Date.now();

    // Turn off mic while network request is in flight
    stopListening();

    // Optimistically show user message
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: userText.trim(),
      timestamp: new Date().toISOString(),
      audioSeconds: audioInputSeconds,
    };
    setTranscript((prev) => [...prev, userMsg]);
    setIsThinking(true);
    isThinkingRef.current = true;

    try {
      const res = await fetch(getApiUrl(`/api/sessions/${activeSession.id}/message`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText.trim(),
          audioInputSeconds,
        }),
      });

      if (!res.ok) throw new Error('Server failed to generate voice response');
      const data = await res.json();

      setIsThinking(false);
      isThinkingRef.current = false;
      isSendingRef.current = false;

      setSession(data.session);
      sessionRef.current = data.session;
      if (onSessionUpdate) onSessionUpdate(data.session);

      // Stream the agent response with live typing and spoken voice
      streamAgentResponse(data.agentText, data.audioOutputSeconds || 3);
    } catch (err) {
      setIsThinking(false);
      isThinkingRef.current = false;
      isSendingRef.current = false;
      setError(err.message);
      // Resume listening loop on error so call doesn't get stuck
      scheduleListeningRestart(1000);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || !session || session.status !== 'active') return;
    const msg = textInput;
    setTextInput('');
    handleInterrupt();
    stopListening();
    sendMessage(msg, 2);
  };

  return (
    <div className="voice-agent-container">
      {/* Browser / HTTPS compatibility warnings */}
      {!speechSupported && (
        <div className="error-banner" style={{ marginTop: 0 }}>
          ⚠️ <strong>Voice not supported</strong> in this browser. Please use <strong>Chrome</strong> or <strong>Edge</strong> on desktop/Android for voice calls. You can still use text chat below.
        </div>
      )}
      {speechSupported && !isHttps && (
        <div className="error-banner" style={{ marginTop: 0, borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', color: '#fcd34d' }}>
          ⚠️ Microphone requires <strong>HTTPS</strong>. Voice may not work on this HTTP connection. Use the live Render URL for full support.
        </div>
      )}

      {/* Top Configuration Bar */}
      <div className="agent-config-card">
        <div className="config-header">
          <div className="config-title-group">
            <div className="config-icon-badge">
              <Settings size={18} />
            </div>
            <div>
              <h3>Persona & System Prompt</h3>
              <p className="config-sub">Select the agent persona to use for the conversation.</p>
            </div>
          </div>
          {session?.status === 'active' && (
            <span className="call-live-tag">
              <span className="pulsing-dot" /> Live Call: {formatTime(callDuration)}
            </span>
          )}
        </div>

        <div className="config-body">
          <div className="form-group">
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              disabled={session?.status === 'active'}
              className="select-input"
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPersona === 'custom' && (
            <div className="form-group full-width">
              <input
                type="text"
                placeholder="e.g. You are a medical clinic booking assistant..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={session?.status === 'active'}
                className="text-field"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Interactive Studio */}
      <div className="studio-layout">
        {/* Left Side: Voice Orb & Controls */}
        <div className="voice-orb-card">
          <div className="orb-wrapper">
            <div
              className={`voice-orb ${
                isSpeaking
                  ? 'orb-speaking'
                  : isListening
                  ? 'orb-listening'
                  : isThinking
                  ? 'orb-thinking'
                  : 'orb-idle'
              }`}
            >
              <div className="orb-core">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="orb-icon">
                  <rect x="9" y="18" width="2.8" height="8" rx="1.4" fill="white" />
                  <rect x="14" y="13" width="2.8" height="18" rx="1.4" fill="white" />
                  <rect x="19" y="8" width="2.8" height="28" rx="1.4" fill="white" />
                  <rect x="24" y="15" width="2.8" height="14" rx="1.4" fill="white" />
                  <path d="M32 9 C32 12.5 29 13.5 29 13.5 C32 13.5 32 17 32 17 C32 13.5 35 13.5 35 13.5 C32 13.5 32 9 32 9 Z" fill="white" />
                </svg>
              </div>
              <div className="orb-ring ring-1" />
              <div className="orb-ring ring-2" />
            </div>

            <div className="orb-status-text">
              <h3 className="orb-main-heading">
                {isSpeaking
                  ? 'Agent is speaking...'
                  : isListening
                  ? 'Listening... Speak anytime'
                  : isThinking
                  ? 'Gemini is thinking...'
                  : session?.status === 'active'
                  ? 'Call connected. Microphone active!'
                  : 'Call ended. Start a call to begin.'}
              </h3>
              <p className="orb-sub-text">Have a natural voice conversation with Gemini AI.</p>
            </div>
          </div>

          {/* Call Controls */}
          <div className="call-actions">
            {!session || session.status !== 'active' ? (
              <button
                className={`call-btn btn-start ${isConnecting ? 'loading' : ''}`}
                onClick={handleStartCall}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <span className="spinner" />
                    <span>Connecting Call...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall size={18} />
                    <span>Start Voice Call</span>
                  </>
                )}
              </button>
            ) : (
              <div className="active-controls">
                <button
                  className={`ctrl-btn ${isMuted ? 'btn-mic-muted' : 'btn-mic'}`}
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  <span>{isMuted ? 'Muted' : 'Live Mic'}</span>
                </button>

                {isSpeaking && (
                  <button
                    className="ctrl-btn btn-interrupt"
                    onClick={handleInterrupt}
                    title="Interrupt agent speech (Barge-in)"
                  >
                    <Square size={18} />
                    <span>Interrupt</span>
                  </button>
                )}

                <button className="ctrl-btn btn-end" onClick={handleEndCall} title="End Call">
                  <PhoneOff size={20} />
                  <span>End</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar for active call */}
          <div className="call-mini-metrics">
            <div className="mini-stat">
              <Clock size={13} />
              <span>{callDuration || session?.durationSeconds || 0}s</span>
            </div>
            <div className="mini-stat">
              <Activity size={13} />
              <span>${(session?.cost?.totalCost || 0).toFixed(5)}</span>
            </div>
            <div className="mini-stat">
              <span>Tokens: {session?.usage?.totalTokens || 0}</span>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}
        </div>

        {/* Right Side: Live Interaction Transcript with Agent Writing */}
        <div className="transcript-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <MessageSquare size={18} />
              </div>
              <div>
                <h3>Live Conversation Transcript</h3>
                <p className="panel-sub">Real-time conversation with Gemini Voice Agent</p>
              </div>
            </div>
            <span className="badge-turns">
              <span className="turns-dot" /> {transcript.length} turns
            </span>
          </div>

          <div className="transcript-scroll">
            {transcript.length === 0 && !interimText && !isThinking ? (
              <div className="transcript-empty">
                <Bot size={40} className="empty-icon" />
                <p>No messages yet.</p>
                <small>Start the call and speak freely. The conversation flows back and forth continuously.</small>
              </div>
            ) : (
              transcript.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`chat-bubble-row ${msg.role === 'user' ? 'user-row' : 'agent-row'}`}
                >
                  <div className="avatar">
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="bubble-content">
                    <div className="bubble-meta">
                      <span className="sender-name">{msg.role === 'user' ? 'You' : 'Gemini Agent'}</span>
                      <span className="timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="bubble-text">
                      {msg.text}
                      {msg.role === 'agent' && isSpeaking && msg.id === transcript[transcript.length - 1]?.id && (
                        <span className="writing-cursor">|</span>
                      )}
                    </p>
                    <span className="bubble-audio-tag">
                      🔊 {msg.audioSeconds || 0}s speech
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Live Interim User Speech */}
            {interimText && (
              <div className="chat-bubble-row user-row interim-row">
                <div className="avatar">
                  <User size={16} />
                </div>
                <div className="bubble-content interim-content">
                  <div className="bubble-meta">
                    <span className="sender-name">You (speaking...)</span>
                  </div>
                  <p className="bubble-text">{interimText} <span className="listening-pulse">...</span></p>
                </div>
              </div>
            )}

            {isThinking && (
              <div className="chat-bubble-row agent-row">
                <div className="avatar">
                  <Bot size={16} />
                </div>
                <div className="bubble-content typing-indicator">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                  <span className="thinking-text">Agent thinking & preparing response...</span>
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Text input with attachment icon and send button */}
          <form className="message-form" onSubmit={handleManualSubmit}>
            <button type="button" className="attach-btn" title="Attach file">
              <Paperclip size={18} />
            </button>
            <input
              type="text"
              placeholder="Start a call to chat..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={!session || session.status !== 'active'}
              className="text-input-field"
            />
            <button
              type="submit"
              disabled={!session || session.status !== 'active' || !textInput.trim() || isThinking}
              className="send-btn"
              title="Send message"
            >
              {isThinking ? <span className="spinner mini-spinner" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
