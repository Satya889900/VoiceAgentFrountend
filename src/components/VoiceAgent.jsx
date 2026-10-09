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
  Coins
} from 'lucide-react';

export default function VoiceAgent({ personas = [], onSessionUpdate }) {
  const [session, setSession] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState('customer_support');
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

    try {
      const res = await fetch('/api/sessions/start', {
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
      const res = await fetch(`/api/sessions/${activeId}/end`, {
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
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        // Ensure complete text is displayed
        setTranscript((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: fullText } : m))
        );
        // Turn-taking: resume listening automatically for continuous conversation
        scheduleListeningRestart(300);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        scheduleListeningRestart(300);
      };

      // Anchor to global window to avoid Chrome GC bug
      window._currentVoiceUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      // If no speech synthesis supported, auto-resume after typing finishes
      setTimeout(() => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        scheduleListeningRestart(300);
      }, audioOutputSeconds * 1000);
    }
  };

  // Continuous SpeechRecognition Setup
  const startListening = () => {
    if (!isCallActiveRef.current || isMutedRef.current || isSpeakingRef.current || isThinkingRef.current) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech Recognition is not supported in this browser. Use text chat below.');
      return;
    }

    // Abort any existing instance cleanly
    if (recognitionRef.current) {
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
      recognition.lang = 'en-US';

      speechStartTimeRef.current = Date.now();

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setError(null);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalized = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalized += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (interim) {
          // User is speaking - barge-in if agent is speaking
          if (isSpeakingRef.current) {
            handleInterrupt();
          }
          setInterimText(interim);
        }

        if (finalized && finalized.trim()) {
          setInterimText('');
          const durationSec = Math.max(1, Math.round((Date.now() - speechStartTimeRef.current) / 1000));
          // Stop recognition temporarily while sending message to avoid hearing agent
          try {
            recognition.stop();
          } catch (e) {}
          setIsListening(false);
          isListeningRef.current = false;
          sendMessage(finalized.trim(), durationSec);
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
        // Keep-alive loop: if call is still active and agent is idle, restart recognition!
        if (
          isCallActiveRef.current &&
          !isMutedRef.current &&
          !isSpeakingRef.current &&
          !isThinkingRef.current
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

  // Send message to backend Gemini API
  const sendMessage = async (userText, audioInputSeconds = 2) => {
    const activeSession = sessionRef.current;
    if (!activeSession || !userText.trim()) return;

    // Optimistically show user message
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
      audioSeconds: audioInputSeconds,
    };
    setTranscript((prev) => [...prev, userMsg]);
    setIsThinking(true);
    isThinkingRef.current = true;

    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          audioInputSeconds,
        }),
      });

      if (!res.ok) throw new Error('Server failed to generate voice response');
      const data = await res.json();

      setIsThinking(false);
      isThinkingRef.current = false;

      setSession(data.session);
      sessionRef.current = data.session;
      if (onSessionUpdate) onSessionUpdate(data.session);

      // Stream the agent response with live typing and spoken voice
      streamAgentResponse(data.agentText, data.audioOutputSeconds || 3);
    } catch (err) {
      setIsThinking(false);
      isThinkingRef.current = false;
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
      {/* Top Configuration Bar */}
      <div className="agent-config-card">
        <div className="config-header">
          <div className="flex-center gap-2">
            <Settings size={18} className="text-primary" />
            <span className="font-semibold">Persona & System Prompt</span>
          </div>
          {session?.status === 'active' && (
            <span className="call-live-tag">
              <span className="pulsing-dot" /> Live Call: {formatTime(callDuration)}
            </span>
          )}
        </div>

        <div className="config-body">
          <div className="form-group">
            <label>Agent Persona</label>
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
              <label>Custom System Instruction</label>
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
                {isSpeaking ? (
                  <Volume2 size={44} className="orb-icon text-accent" />
                ) : isListening ? (
                  <Mic size={44} className="orb-icon text-danger" />
                ) : (
                  <Sparkles size={44} className="orb-icon text-primary" />
                )}
              </div>
              <div className="orb-ring ring-1" />
              <div className="orb-ring ring-2" />
            </div>

            <div className="orb-status-text">
              {isSpeaking ? (
                <span className="status-highlight speaking">Agent is speaking & writing...</span>
              ) : isListening ? (
                <span className="status-highlight listening">Listening continuously... Speak anytime</span>
              ) : isThinking ? (
                <span className="status-highlight thinking">Gemini is thinking...</span>
              ) : session?.status === 'active' ? (
                <span className="status-highlight ready">Call connected. Microphone is active!</span>
              ) : (
                <span className="status-highlight idle">Call ended. Start a call to begin.</span>
              )}
            </div>
          </div>

          {/* Call Controls */}
          <div className="call-actions">
            {!session || session.status !== 'active' ? (
              <button className="call-btn btn-start" onClick={handleStartCall}>
                <PhoneCall size={20} />
                <span>Start Voice Call</span>
              </button>
            ) : (
              <div className="active-controls">
                <button
                  className={`ctrl-btn ${isMuted ? 'btn-mic-muted' : 'btn-mic'}`}
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                  <span>{isMuted ? 'Muted' : 'Live Mic'}</span>
                </button>

                {isSpeaking && (
                  <button
                    className="ctrl-btn btn-interrupt"
                    onClick={handleInterrupt}
                    title="Interrupt agent speech (Barge-in)"
                  >
                    <Square size={20} />
                    <span>Interrupt</span>
                  </button>
                )}

                <button className="ctrl-btn btn-end" onClick={handleEndCall} title="End Call">
                  <PhoneOff size={22} />
                  <span>End</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar for active call */}
          {session && (
            <div className="call-mini-metrics">
              <div className="mini-stat">
                <Clock size={14} />
                <span>{session.durationSeconds || callDuration}s</span>
              </div>
              <div className="mini-stat">
                <Coins size={14} />
                <span>${(session.cost?.totalCost || 0).toFixed(5)}</span>
              </div>
              <div className="mini-stat">
                <span>Tokens: {session.usage?.totalTokens || 0}</span>
              </div>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}
        </div>

        {/* Right Side: Live Interaction Transcript with Agent Writing */}
        <div className="transcript-panel">
          <div className="panel-header">
            <div className="flex-center gap-2">
              <h3>Live Conversation Transcript</h3>
              {session?.status === 'active' && (
                <span className="live-call-status">● Continuous Hands-Free</span>
              )}
            </div>
            <span className="badge-turns">{transcript.length} turns</span>
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
                    {msg.audioSeconds && (
                      <span className="bubble-audio-tag">🎙️ ~{msg.audioSeconds}s speech</span>
                    )}
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

          {/* Text input fallback */}
          <form className="message-form" onSubmit={handleManualSubmit}>
            <input
              type="text"
              placeholder={
                session?.status === 'active'
                  ? 'Speak freely or type a message here...'
                  : 'Start a call to chat...'
              }
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={!session || session.status !== 'active'}
              className="text-input-field"
            />
            <button
              type="submit"
              disabled={!session || session.status !== 'active' || !textInput.trim()}
              className="send-btn"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
