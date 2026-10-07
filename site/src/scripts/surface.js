import Alpine from 'alpinejs';
import { currentState, works, selectCrop } from '../lib/current-state.mjs';
import { counterProvider, formatCounter } from '../lib/counter.mjs';

Alpine.data('hmaSurface', () => ({
  state: null,
  encounter: null,
  mobile: false,
  reducedMotion: false,
  crop: currentState.crops[0],
  counter: '00381.627',
  lastValue: -Infinity,
  clock: null,
  surfacingTimer: null,
  dismissalTimer: null,
  returnFocus: null,
  mediaQuery: null,
  motionQuery: null,
  visibilityHandler: null,
  mediaHandler: null,
  motionHandler: null,
  lastEncounter: null,

  init() {
    let storage;
    try { storage = window.sessionStorage; } catch {}
    this.crop = selectCrop(storage);
    this.mediaQuery = window.matchMedia('(max-width: 767px), (hover: none)');
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.mobile = this.mediaQuery.matches;
    this.reducedMotion = this.motionQuery.matches;
    this.mediaHandler = () => {
      this.mobile = this.mediaQuery.matches;
      this.hideEncounter();
      this.scheduleEncounter();
    };
    this.motionHandler = () => {
      this.reducedMotion = this.motionQuery.matches;
      this.syncMedia();
    };
    this.visibilityHandler = () => {
      if (document.hidden) this.hideEncounter();
      else { this.updateCounter(); this.scheduleEncounter(); }
    };
    this.mediaQuery.addEventListener('change', this.mediaHandler);
    this.motionQuery.addEventListener('change', this.motionHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.updateCounter();
    this.clock = setInterval(() => this.updateCounter(), 100);
    this.scheduleEncounter();
  },

  destroy() {
    clearInterval(this.clock);
    clearTimeout(this.surfacingTimer);
    clearTimeout(this.dismissalTimer);
    this.mediaQuery?.removeEventListener('change', this.mediaHandler);
    this.motionQuery?.removeEventListener('change', this.motionHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.pauseMedia();
  },

  updateCounter() {
    this.lastValue = Math.max(this.lastValue, counterProvider.valueAt(Date.now()));
    this.counter = formatCounter(this.lastValue);
  },

  openState(id) {
    if (id !== 'hma' && !works.some((work) => work.id === id)) return;
    if (!this.state) this.returnFocus = document.activeElement;
    this.hideEncounter();
    clearTimeout(this.surfacingTimer);
    this.state = id;
    this.$nextTick(() => {
      this.$refs.information.scrollTop = 0;
      this.$refs.close.focus({ preventScroll: true });
    });
  },

  closeState() {
    if (!this.state) { this.hideEncounter(); this.scheduleEncounter(); return; }
    this.state = null;
    this.$nextTick(() => {
      const target = this.returnFocus;
      if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true });
      else this.$refs.hma.focus({ preventScroll: true });
    });
    this.scheduleEncounter();
  },

  trapFocus(event) {
    if (!this.state || event.key !== 'Tab') return;
    const targets = [...this.$refs.information.querySelectorAll('button, a[href]')]
      .filter((element) => element.getClientRects().length && !element.disabled);
    const first = targets[0];
    const last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  },

  showEncounter(id) {
    if (this.state || document.hidden) return;
    this.encounter = id;
    this.$nextTick(() => this.syncMedia());
  },

  leaveEncounter(id) {
    if (!this.mobile && this.encounter === id) this.hideEncounter();
  },

  hideEncounter() {
    clearTimeout(this.dismissalTimer);
    this.encounter = null;
    this.pauseMedia();
  },

  scheduleEncounter() {
    clearTimeout(this.surfacingTimer);
    if (!this.mobile || this.state || document.hidden) return;
    this.surfacingTimer = setTimeout(() => {
      if (!this.mobile || this.state || document.hidden) return;
      const candidates = works.filter((work) => work.id !== this.lastEncounter);
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      this.lastEncounter = selected.id;
      this.showEncounter(selected.id);
      this.dismissalTimer = setTimeout(() => {
        this.hideEncounter();
        this.scheduleEncounter();
      }, 6500 + Math.random() * 4000);
    }, 20000 + Math.random() * 35000);
  },

  restActivity() {
    if (this.mobile && !this.state && !this.encounter) this.scheduleEncounter();
  },

  pauseMedia() {
    document.querySelectorAll('.encounter video').forEach((video) => video.pause());
  },

  syncMedia() {
    document.querySelectorAll('.encounter video').forEach(async (video) => {
      if (this.state || video.dataset.work !== this.encounter || this.reducedMotion) { video.pause(); return; }
      video.currentTime = 0;
      video.muted = false;
      try { await video.play(); } catch {
        video.muted = true;
        try { await video.play(); } catch {}
      }
      if (this.state || video.dataset.work !== this.encounter) video.pause();
    });
  },
}));

Alpine.start();