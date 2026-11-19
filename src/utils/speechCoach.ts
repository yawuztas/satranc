/**
 * Web Speech API Turkish Voice Coach
 * Synthesizes Grandmaster coaching advice in natural Turkish speech.
 */

class SpeechCoach {
  private isEnabled: boolean = false;
  private isCurrentlySpeaking: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.isEnabled = localStorage.getItem('satranc_speech_enabled') === 'true';
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('satranc_speech_enabled', enabled ? 'true' : 'false');
      if (!enabled) {
        this.stop();
      }
    }
    this.notify();
  }

  public toggle(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isCurrentlySpeaking = false;
      this.notify();
    }
  }

  public speak(text: string, force: boolean = false): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!this.isEnabled && !force) return;

    this.stop();

    // Clean emojis, markdown symbols, and technical chess artifacts for natural pronunciation
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[#*_`~[\]()]/g, '')
      .replace(/cp\b/gi, 'santipiyon')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick Turkish voice if available
    const voices = window.speechSynthesis.getVoices();
    const trVoice = voices.find((v) => v.lang.startsWith('tr') || v.name.toLowerCase().includes('turkish'));
    if (trVoice) {
      utterance.voice = trVoice;
    }

    utterance.onstart = () => {
      this.isCurrentlySpeaking = true;
      this.notify();
    };

    utterance.onend = () => {
      this.isCurrentlySpeaking = false;
      this.notify();
    };

    utterance.onerror = () => {
      this.isCurrentlySpeaking = false;
      this.notify();
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const speechCoach = new SpeechCoach();
