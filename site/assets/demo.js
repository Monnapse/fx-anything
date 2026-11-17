// \0@oxc-project+runtime@0.156.0/helpers/esm/typeof.js
function e(t) {
	"@babel/helpers - typeof";
	return e = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, e(t);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/toPrimitive.js
function t(t, n) {
	if (e(t) != "object" || !t) return t;
	var r = t[Symbol.toPrimitive];
	if (r !== void 0) {
		var i = r.call(t, n || "default");
		if (e(i) != "object") return i;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (n === "string" ? String : Number)(t);
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/toPropertyKey.js
function n(n) {
	var r = t(n, "string");
	return e(r) == "symbol" ? r : r + "";
}
// \0@oxc-project+runtime@0.156.0/helpers/esm/defineProperty.js
function r(e, t, r) {
	return (t = n(t)) in e ? Object.defineProperty(e, t, {
		value: r,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = r, e;
}
// src/audio/engine.ts
var i = {
	club: {
		decay: 1.3,
		pre: .01,
		slapTime: .07,
		slap: .06,
		bass: 6,
		rev: .75
	},
	theater: {
		decay: 2.3,
		pre: .02,
		slapTime: .12,
		slap: .05,
		bass: 3,
		rev: 1
	},
	arena: {
		decay: 3.4,
		pre: .035,
		slapTime: .19,
		slap: .15,
		bass: 6,
		rev: 1
	},
	stadium: {
		decay: 5,
		pre: .06,
		slapTime: .33,
		slap: .24,
		bass: 7,
		rev: 1.05
	},
	festival: {
		decay: 1.7,
		pre: .02,
		slapTime: .42,
		slap: .22,
		bass: 8,
		rev: .6
	}
}, a = (e, t) => e + Math.random() * (t - e), o = (e, t, n) => e * (t / e) ** +n;
function s(e, t) {
	let n = e.sampleRate, r = Math.max(1, Math.floor(t * n)), i = e.createBuffer(2, r, n), o = 0;
	for (let e = 0; e < 2; e++) {
		let s = i.getChannelData(e), c = 0;
		for (let e = 0; e < r; e++) {
			let r = e / n, i = Math.exp(-6.9 * r / t), a = .06 + .8 * Math.exp(-4 * r / t);
			c += a * (Math.random() * 2 - 1 - c), s[e] = c * i * Math.min(1, r / .008);
		}
		for (let e = 0; e < 10; e++) {
			let e = a(.004, Math.min(.08, t * .25)), i = Math.floor(e * n);
			i < r && (s[i] += (Math.random() < .5 ? -1 : 1) * a(.15, .45) * Math.exp(-6.9 * e / t));
		}
		for (let e = 0; e < r; e++) o += s[e] * s[e];
	}
	let s = 1 / Math.sqrt(o / 2 || 1);
	for (let e = 0; e < 2; e++) {
		let t = i.getChannelData(e);
		for (let e = 0; e < r; e++) t[e] *= s;
	}
	return i;
}
function c(e) {
	if (!e) return null;
	let t = 2048, n = new Float32Array(t), r = Math.tanh(e);
	for (let i = 0; i < t; i++) {
		let t = i / 2047 * 2 - 1;
		n[i] = Math.tanh(e * t) / r;
	}
	return n;
}
var l = class {
	constructor(e, t) {
		r(this, "l", void 0), r(this, "r", void 0), r(this, "buf", void 0);
		let n = e.createChannelSplitter(2);
		this.l = e.createAnalyser(), this.r = e.createAnalyser(), this.l.fftSize = this.r.fftSize = 1024, t.connect(n), n.connect(this.l, 0), n.connect(this.r, 1), this.buf = /* @__PURE__ */ new Float32Array(1024);
	}
	read() {
		let e = (e) => {
			e.getFloatTimeDomainData(this.buf);
			let t = 0, n = 0;
			for (let e = 0; e < this.buf.length; e++) {
				let r = this.buf[e];
				n += r * r;
				let i = r < 0 ? -r : r;
				i > t && (t = i);
			}
			return [t, Math.sqrt(n / this.buf.length)];
		}, [t, n] = e(this.l), [r, i] = e(this.r);
		return {
			peak: [t, r],
			rms: [n, i]
		};
	}
}, u = class e {
	static async create(t, n, r) {
		return await t.audioWorklet.addModule(r), new e(t, n);
	}
	constructor(e, t) {
		r(this, "ctx", void 0), r(this, "source", void 0), r(this, "s", null), r(this, "oscs", []), r(this, "ir", {}), r(this, "karaoke", void 0), r(this, "pitch", void 0), r(this, "eq", void 0), r(this, "muffle", void 0), r(this, "lofi", void 0), r(this, "widen", void 0), r(this, "eightD", void 0), r(this, "echo", void 0), r(this, "reverb", void 0), r(this, "concert", void 0), r(this, "djf", void 0), r(this, "master", void 0), r(this, "inMeter", void 0), r(this, "outMeter", void 0), r(this, "freq", void 0), r(this, "edges", void 0), this.ctx = e, this.source = t, this.karaoke = this.buildKaraoke(), this.pitch = this.buildPitch(), this.eq = this.buildEQ(), this.muffle = this.buildMuffle(), this.lofi = this.buildLofi(), this.widen = this.buildWiden(), this.eightD = this.build8D(), this.echo = this.buildEcho(), this.reverb = this.buildReverb(), this.concert = this.buildConcert(), this.djf = this.buildDJFilter(), this.master = this.buildMaster();
		let n = [
			this.karaoke,
			this.pitch,
			this.eq,
			this.muffle,
			this.lofi,
			this.widen,
			this.eightD,
			this.echo,
			this.reverb,
			this.concert,
			this.djf
		];
		t.connect(n[0].input);
		for (let e = 0; e < n.length - 1; e++) n[e].output.connect(n[e + 1].input);
		n[n.length - 1].output.connect(this.master.chain), t.connect(this.master.bypass), this.inMeter = new l(e, t), this.outMeter = new l(e, this.master.output), this.freq = new Uint8Array(this.master.analyser.frequencyBinCount), this.edges = this.makeBands(48);
	}
	gain(e = 1) {
		let t = this.ctx.createGain();
		return t.gain.value = e, t;
	}
	biq(e, t, n, r) {
		let i = this.ctx.createBiquadFilter();
		return i.type = e, i.frequency.value = t, n != null && (i.Q.value = n), r != null && (i.gain.value = r), i;
	}
	mono() {
		let e = this.gain(1);
		return e.channelCount = 1, e.channelCountMode = "explicit", e.channelInterpretation = "speakers", e;
	}
	stereo() {
		let e = this.gain(1);
		return e.channelCount = 2, e.channelCountMode = "explicit", e.channelInterpretation = "speakers", e;
	}
	set(e, t, n = .035) {
		let r = this.ctx.currentTime;
		e.cancelScheduledValues(r), e.setTargetAtTime(t, r, n);
	}
	osc(e) {
		let t = this.ctx.createOscillator();
		return t.frequency.value = e, t.start(), this.oscs.push(t), t;
	}
	mod() {
		let e = {
			input: this.gain(1),
			output: this.gain(1),
			dry: this.gain(1),
			wet: this.gain(0)
		};
		return e.input.connect(e.dry), e.dry.connect(e.output), e.wet.connect(e.output), e.mix = (t) => {
			this.set(e.dry.gain, 1 - t), this.set(e.wet.gain, t);
		}, e;
	}
	irFor(e) {
		var t;
		let n = e.toFixed(2);
		return (t = this.ir)[n] || (t[n] = s(this.ctx, e));
	}
	buildKaraoke() {
		let e = this.ctx, t = this.mod(), n = this.stereo(), r = e.createChannelSplitter(2);
		t.input.connect(n), n.connect(r);
		let i = this.mono(), a = this.gain(-1);
		r.connect(i, 0), r.connect(a, 1), a.connect(i);
		let o = this.biq("highpass", 140, .7), s = this.gain(1.3);
		i.connect(o), o.connect(s), s.connect(t.wet);
		let c = this.biq("lowpass", 140, .7);
		return t.input.connect(c), c.connect(t.wet), t;
	}
	buildPitch() {
		let e = this.mod(), t = new AudioWorkletNode(this.ctx, "pitch-shifter", {
			numberOfInputs: 1,
			numberOfOutputs: 1,
			outputChannelCount: [2]
		});
		return e.input.connect(t), t.connect(e.wet), Object.assign(e, { node: t });
	}
	buildEQ() {
		let e = this.biq("lowshelf", 110, null, 0), t = this.biq("peaking", 1e3, .8, 0), n = this.biq("highshelf", 7e3, null, 0);
		return e.connect(t), t.connect(n), {
			input: e,
			output: n,
			low: e,
			mid: t,
			high: n
		};
	}
	buildMuffle() {
		let e = this.mod(), t = this.biq("highpass", 20, 0), n = this.biq("lowpass", 800, 0), r = this.ctx.createWaveShaper();
		r.oversample = "2x";
		let i = this.gain(1.5);
		e.input.connect(t), t.connect(n), n.connect(r), r.connect(i), i.connect(e.wet);
		let a = this.osc(.22), o = this.gain(0);
		return a.connect(o), o.connect(n.frequency), Object.assign(e, {
			hp: t,
			lp: n,
			shaper: r,
			makeup: i,
			lfoAmt: o,
			mode: null
		});
	}
	buildLofi() {
		let e = this.mod(), t = this.ctx.createDelay(.1);
		t.delayTime.value = .015;
		let n = this.osc(.55), r = this.gain(0), i = this.osc(.13), a = this.gain(0);
		n.connect(r), r.connect(t.delayTime), i.connect(a), a.connect(t.delayTime);
		let o = this.biq("lowpass", 3800, 0), s = this.biq("lowshelf", 180, null, 3), l = this.ctx.createWaveShaper();
		return l.curve = c(1.4), l.oversample = "2x", e.input.connect(t), t.connect(o), o.connect(s), s.connect(l), l.connect(e.wet), Object.assign(e, {
			w1g: r,
			w2g: a,
			lp: o
		});
	}
	buildWiden() {
		let e = this.ctx, t = this.mod(), n = this.stereo(), r = e.createChannelSplitter(2), i = e.createChannelMerger(2);
		t.input.connect(n), n.connect(r);
		let a = this.mono(), o = this.mono(), s = this.gain(.5), c = this.gain(.5), l = this.gain(.5), u = this.gain(-.5);
		r.connect(s, 0), r.connect(c, 1), r.connect(l, 0), r.connect(u, 1), s.connect(a), c.connect(a), l.connect(o), u.connect(o);
		let d = this.gain(1.8), f = this.gain(-1);
		return o.connect(d), d.connect(f), a.connect(i, 0, 0), a.connect(i, 0, 1), d.connect(i, 0, 0), f.connect(i, 0, 1), i.connect(t.wet), Object.assign(t, { width: d });
	}
	build8D() {
		let e = this.ctx, t = this.mod(), n = e.createPanner();
		n.panningModel = "HRTF", n.distanceModel = "linear", n.refDistance = 1, n.maxDistance = 1e4, n.rolloffFactor = 0, n.positionX.value = 0, n.positionY.value = 0, n.positionZ.value = 0;
		let r = e.currentTime + .05, i = e.createOscillator(), a = e.createOscillator();
		a.setPeriodicWave(e.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]), { disableNormalization: !0 })), i.frequency.value = a.frequency.value = 1 / 8;
		let o = this.gain(2), s = this.gain(2);
		i.connect(o), o.connect(n.positionX), a.connect(s), s.connect(n.positionZ), i.start(r), a.start(r), this.oscs.push(i, a);
		let c = this.gain(1.15);
		return t.input.connect(n), n.connect(c), c.connect(t.wet), Object.assign(t, {
			sx: i,
			cz: a
		});
	}
	buildEcho() {
		let e = this.mod(), t = this.gain(1), n = this.ctx.createDelay(2), r = this.gain(.35), i = this.biq("lowpass", 3200, 0), a = this.gain(.3);
		return e.input.connect(t), t.connect(e.wet), e.input.connect(n), n.connect(i), i.connect(r), r.connect(n), i.connect(a), a.connect(e.wet), Object.assign(e, {
			delay: n,
			fb: r,
			out: a
		});
	}
	buildReverb() {
		let e = this.mod(), t = this.gain(1), n = this.ctx.createDelay(.2), r = this.ctx.createConvolver(), i = this.biq("lowpass", 7e3, 0), a = this.gain(.4);
		return r.normalize = !1, n.delayTime.value = .018, e.input.connect(t), t.connect(e.wet), e.input.connect(n), n.connect(r), r.connect(i), i.connect(a), a.connect(e.wet), Object.assign(e, {
			direct: t,
			conv: r,
			out: a,
			size: null,
			timer: 0
		});
	}
	buildConcert() {
		let e = this.ctx, t = this.mod(), n = this.biq("lowshelf", 90, null, 6), r = this.biq("highshelf", 3500, null, -4), i = e.createDynamicsCompressor();
		i.threshold.value = -22, i.knee.value = 10, i.ratio.value = 3, i.attack.value = .01, i.release.value = .2, t.input.connect(n), n.connect(r), r.connect(i);
		let a = this.gain(.7);
		i.connect(a), a.connect(t.wet);
		let o = e.createDelay(.5), s = e.createConvolver(), c = this.biq("lowpass", 6500, 0), l = this.gain(.7);
		s.normalize = !1, i.connect(o), o.connect(s), s.connect(c), c.connect(l), l.connect(t.wet);
		let u = e.createDelay(1), d = this.biq("lowpass", 2200, 0), f = this.gain(.1);
		return i.connect(u), u.connect(d), d.connect(f), f.connect(t.wet), f.connect(s), Object.assign(t, {
			low: n,
			high: r,
			direct: a,
			pre: o,
			conv: s,
			revOut: l,
			slap: u,
			slapG: f,
			venue: null
		});
	}
	buildDJFilter() {
		let e = this.biq("highpass", 10, 0), t = this.biq("lowpass", 22e3, 0);
		return e.connect(t), {
			input: e,
			output: t,
			hp: e,
			lp: t
		};
	}
	buildMaster() {
		let e = this.ctx, t = this.gain(1), n = this.gain(1), r = this.gain(0), i = this.gain(1), a = e.createDynamicsCompressor(), o = this.gain(.92), s = e.createAnalyser();
		return a.threshold.value = -2, a.knee.value = 0, a.ratio.value = 20, a.attack.value = .002, a.release.value = .15, s.fftSize = 4096, s.smoothingTimeConstant = .8, n.connect(t), r.connect(t), t.connect(i), i.connect(a), a.connect(o), o.connect(s), o.connect(e.destination), {
			input: t,
			chain: n,
			bypass: r,
			volume: i,
			output: o,
			analyser: s
		};
	}
	apply(e) {
		this.s = e;
		let t = this.set.bind(this);
		this.karaoke.mix(e.karaoke.on ? e.karaoke.strength / 100 : 0), this.pitch.node.parameters.get("ratio").value = 2 ** (e.pitch.semitones / 12), this.pitch.mix(e.pitch.on && e.pitch.semitones !== 0 ? 1 : 0), t(this.eq.low.gain, e.eq.on ? e.eq.bass : 0), t(this.eq.mid.gain, e.eq.on ? e.eq.mid : 0), t(this.eq.high.gain, e.eq.on ? e.eq.treble : 0);
		{
			let n = this.muffle, r = e.muffle.amount / 100, i = 20, a, s = 0, l = 0, u = 1.5, d = 0;
			switch (e.muffle.mode) {
				case "underwater":
					a = o(1200, 220, r), s = 9, u = 1.4, d = a * .35;
					break;
				case "radio":
					i = 450, a = o(5e3, 1800, r), s = 3, l = 2.5, u = 1.6;
					break;
				case "phone":
					i = 380, a = o(3600, 2e3, r), s = 2, l = 1.6, u = 2;
					break;
				default: a = o(1800, 140, r), u = 1.2 + r * .8;
			}
			t(n.hp.frequency, i), t(n.lp.frequency, a), t(n.lp.Q, s), t(n.makeup.gain, u), t(n.lfoAmt.gain, d), n.mode !== e.muffle.mode && (n.mode = e.muffle.mode, n.shaper.curve = c(l)), n.mix(+!!e.muffle.on);
		}
		{
			let n = this.lofi, r = e.lofi.wobble / 100;
			t(n.w1g.gain, r * .0032), t(n.w2g.gain, r * .0022), t(n.lp.frequency, 7e3 * (1400 / 7e3) ** (e.lofi.warmth / 100)), n.mix(+!!e.lofi.on);
		}
		t(this.widen.width.gain, e.widen.width / 100), this.widen.mix(+!!e.widen.on);
		{
			let n = 1 / Math.max(1, e.eightD.speed);
			t(this.eightD.sx.frequency, n, .3), t(this.eightD.cz.frequency, n, .3), this.eightD.mix(e.eightD.on ? e.eightD.intensity / 100 : 0);
		}
		t(this.echo.delay.delayTime, e.echo.time / 1e3, .08), t(this.echo.fb.gain, e.echo.feedback / 100 * .85), t(this.echo.out.gain, e.echo.mix / 100), this.echo.mix(+!!e.echo.on);
		{
			let n = this.reverb, r = e.reverb.mix / 100;
			if (n.size !== e.reverb.size) {
				let t = n.size === null;
				n.size = e.reverb.size, clearTimeout(n.timer);
				let r = () => {
					n.conv.buffer = this.irFor(.6 + e.reverb.size / 100 * 6.4);
				};
				t ? r() : n.timer = window.setTimeout(r, 140);
			}
			t(n.direct.gain, 1 - r * .35), t(n.out.gain, r * 1.1), n.mix(+!!e.reverb.on);
		}
		{
			let n = this.concert, r = i[e.concert.venue] || i.arena, a = e.concert.distance / 100;
			n.venue !== e.concert.venue && (n.venue = e.concert.venue, n.conv.buffer = this.irFor(r.decay), t(n.pre.delayTime, r.pre, .05), t(n.slap.delayTime, r.slapTime, .05)), t(n.low.gain, r.bass), t(n.high.gain, -1.5 - 9 * a), t(n.direct.gain, 1 - .6 * a), t(n.revOut.gain, (.22 + .9 * a) * r.rev), t(n.slapG.gain, r.slap * (.3 + a)), n.mix(+!!e.concert.on);
		}
		{
			let n = e.filter.on ? e.filter.value / 100 : 0, r = e.filter.res / 100 * 14;
			n < -.02 ? (t(this.djf.lp.frequency, o(2e4, 90, -n), .02), t(this.djf.lp.Q, r), t(this.djf.hp.frequency, 10, .02), t(this.djf.hp.Q, 0)) : n > .02 ? (t(this.djf.hp.frequency, o(20, 9e3, n), .02), t(this.djf.hp.Q, r), t(this.djf.lp.frequency, 22e3, .02), t(this.djf.lp.Q, 0)) : (t(this.djf.lp.frequency, 22e3, .02), t(this.djf.lp.Q, 0), t(this.djf.hp.frequency, 10, .02), t(this.djf.hp.Q, 0));
		}
		t(this.master.chain.gain, +!e.bypass, .015), t(this.master.bypass.gain, +!!e.bypass, .015), t(this.master.volume.gain, e.master.volume / 100);
	}
	get settings() {
		return this.s;
	}
	makeBands(e) {
		let t = this.master.analyser.frequencyBinCount, n = this.ctx.sampleRate / 2 / t, r = [];
		for (let t = 0; t <= e; t++) r.push(Math.max(1, Math.round(30 * 600 ** (t / e) / n)));
		for (let e = 1; e < r.length; e++) r[e] <= r[e - 1] && (r[e] = r[e - 1] + 1);
		return r;
	}
	spectrum() {
		let e = this.freq, t = this.edges;
		this.master.analyser.getByteFrequencyData(e);
		let n = Array(t.length - 1);
		for (let r = 0; r < n.length; r++) {
			let i = 0;
			for (let n = t[r]; n < t[r + 1] && n < e.length; n++) e[n] > i && (i = e[n]);
			n[r] = i;
		}
		return n;
	}
	dispose() {
		clearTimeout(this.reverb.timer), this.oscs.forEach((e) => {
			try {
				e.stop();
			} catch {}
		});
		try {
			this.source.disconnect();
		} catch {}
	}
}, d = {
	bypass: !1,
	master: { volume: 100 },
	filter: {
		on: !0,
		value: 0,
		res: 30
	},
	pitch: {
		on: !1,
		semitones: 0
	},
	concert: {
		on: !1,
		venue: "arena",
		distance: 50
	},
	eightD: {
		on: !1,
		speed: 8,
		intensity: 100
	},
	reverb: {
		on: !1,
		size: 45,
		mix: 35
	},
	echo: {
		on: !1,
		time: 320,
		feedback: 35,
		mix: 30
	},
	eq: {
		on: !1,
		bass: 0,
		mid: 0,
		treble: 0
	},
	muffle: {
		on: !1,
		mode: "room",
		amount: 60
	},
	lofi: {
		on: !1,
		warmth: 50,
		wobble: 40
	},
	widen: {
		on: !1,
		width: 180
	},
	karaoke: {
		on: !1,
		strength: 100
	}
}, f = [
	{
		id: "concert",
		label: "Live Concert",
		key: "1",
		patch: {
			concert: {
				on: !0,
				venue: "arena",
				distance: 55
			},
			eq: {
				on: !0,
				bass: 3
			}
		}
	},
	{
		id: "eightD",
		label: "8D Audio",
		key: "2",
		patch: {
			eightD: {
				on: !0,
				speed: 8,
				intensity: 100
			},
			reverb: {
				on: !0,
				size: 40,
				mix: 28
			}
		}
	},
	{
		id: "slowed",
		label: "Slowed + Reverb",
		key: "3",
		patch: {
			pitch: {
				on: !0,
				semitones: -3
			},
			reverb: {
				on: !0,
				size: 72,
				mix: 45
			},
			eq: {
				on: !0,
				bass: 4,
				treble: -2
			}
		}
	},
	{
		id: "nightcore",
		label: "Nightcore",
		key: "4",
		patch: {
			pitch: {
				on: !0,
				semitones: 4
			},
			eq: {
				on: !0,
				bass: 2,
				treble: 3
			}
		}
	},
	{
		id: "nextroom",
		label: "Next Room",
		key: "5",
		patch: {
			muffle: {
				on: !0,
				mode: "room",
				amount: 65
			},
			reverb: {
				on: !0,
				size: 25,
				mix: 25
			}
		}
	},
	{
		id: "lofi",
		label: "Lo-fi Tape",
		key: "6",
		patch: {
			lofi: {
				on: !0,
				warmth: 55,
				wobble: 45
			},
			pitch: {
				on: !0,
				semitones: -1
			},
			reverb: {
				on: !0,
				size: 30,
				mix: 20
			}
		}
	},
	{
		id: "karaoke",
		label: "Karaoke",
		key: "7",
		patch: {
			karaoke: {
				on: !0,
				strength: 100
			},
			reverb: {
				on: !0,
				size: 35,
				mix: 20
			}
		}
	},
	{
		id: "bass",
		label: "Bass Boost",
		key: "8",
		patch: { eq: {
			on: !0,
			bass: 12,
			mid: -2,
			treble: 2
		} }
	}
], p = (e) => JSON.parse(JSON.stringify(e));
function m(e, t) {
	let n = p(d), r = f.find((t) => t.id === e);
	if (r) for (let [e, t] of Object.entries(r.patch)) {
		let r = e;
		n[r] = {
			...n[r],
			...t
		};
	}
	return n.master = { ...t.master }, n;
}
// src/audio/worklets/pitch-shifter.js?raw
var h = "// Real-time pitch shifter (two crossfaded delay taps, Hann windows).\n// Changes pitch without changing tempo, so it works on live input.\nclass PitchShifter extends AudioWorkletProcessor {\n  static get parameterDescriptors() {\n    return [{ name: 'ratio', defaultValue: 1, minValue: 0.25, maxValue: 4, automationRate: 'k-rate' }];\n  }\n\n  constructor() {\n    super();\n    this.size = 1 << 15;\n    this.mask = this.size - 1;\n    this.buf = [new Float32Array(this.size), new Float32Array(this.size)];\n    this.w = 0;\n    this.win = Math.round(sampleRate * 0.05);\n    this.phase = 0;\n  }\n\n  read(b, pos) {\n    const p = pos - Math.floor(pos / this.size) * this.size;\n    const i = Math.floor(p);\n    const f = p - i;\n    return b[i & this.mask] * (1 - f) + b[(i + 1) & this.mask] * f;\n  }\n\n  process(inputs, outputs, params) {\n    const inp = inputs[0] || [];\n    const out = outputs[0];\n    const r = params.ratio[0];\n    const W = this.win;\n    const half = W / 2;\n    const frames = out[0].length;\n    let w = this.w;\n    let phase = this.phase;\n    for (let i = 0; i < frames; i++) {\n      const l = inp[0] ? inp[0][i] : 0;\n      this.buf[0][w] = l;\n      this.buf[1][w] = inp[1] ? inp[1][i] : l;\n      const d1 = phase;\n      const d2 = phase + half >= W ? phase + half - W : phase + half;\n      const s1 = Math.sin((Math.PI * d1) / W);\n      const s2 = Math.sin((Math.PI * d2) / W);\n      const g1 = s1 * s1;\n      const g2 = s2 * s2;\n      for (let c = 0; c < out.length; c++) {\n        const b = this.buf[c > 0 ? 1 : 0];\n        out[c][i] = g1 * this.read(b, w - d1 - 1) + g2 * this.read(b, w - d2 - 1);\n      }\n      w = (w + 1) & this.mask;\n      phase += 1 - r;\n      if (phase < 0) phase += W;\n      else if (phase >= W) phase -= W;\n    }\n    this.w = w;\n    this.phase = phase;\n    return true;\n  }\n}\n\nregisterProcessor('pitch-shifter', PitchShifter);\n", g = [
	{
		id: "original",
		label: "Original",
		note: "The track as-is"
	},
	{
		id: "concert",
		label: "Live Concert",
		note: "Arena reverb, PA punch, distance"
	},
	{
		id: "eightD",
		label: "8D Audio",
		note: "Put headphones on"
	},
	{
		id: "slowed",
		label: "Slowed + Reverb",
		note: "Pitch down, huge space"
	},
	{
		id: "nightcore",
		label: "Nightcore",
		note: "Pitched up and bright"
	},
	{
		id: "nextroom",
		label: "Next Room",
		note: "Party through the wall"
	},
	{
		id: "lofi",
		label: "Lo-fi Tape",
		note: "Warm, wobbly, worn"
	},
	{
		id: "bass",
		label: "Bass Boost",
		note: "Low end turned way up"
	}
], _ = (e) => `${Math.floor(e / 60)}:${String(Math.floor(e % 60)).padStart(2, "0")}`;
function v(e) {
	let t = (t) => e.querySelector(t), n = t("[data-play]"), r = t("[data-ab]"), i = t("[data-pads]"), a = t("[data-filter]"), o = t("[data-filter-out]"), s = t("[data-note]"), c = t("[data-time]"), l = t("[data-bar]"), f = t("[data-spectrum]"), v = t("[data-meter-l]"), y = t("[data-meter-r]"), b = e.dataset.track, x = null, S = null, C = null, w = null, T = null, E = 0, D = 0, O = !1, k = "concert", A = m("concert", p(d)), j = !1;
	i.innerHTML = g.map((e, t) => `<button type="button" class="pad${e.id === k ? " on" : ""}" data-scene="${e.id}" aria-pressed="${e.id === k}"><span class="pad-n">${String(t).padStart(2, "0")}</span><span class="pad-l">${e.label}</span></button>`).join(""), s.textContent = g.find((e) => e.id === k).note;
	let M = () => {
		let e = p(A);
		return e.filter = {
			...e.filter,
			on: !0,
			value: Number(a.value)
		}, e.bypass = j || k === "original", e;
	}, N = () => S?.apply(M());
	async function P() {
		if (S) return;
		x = new AudioContext({ latencyHint: "playback" }), C = await fetch(b).then((e) => e.arrayBuffer()).then((e) => x.decodeAudioData(e)), T = x.createGain(), T.gain.value = .85;
		let e = URL.createObjectURL(new Blob([h], { type: "text/javascript" }));
		S = await u.create(x, T, e), N();
	}
	function F() {
		w = x.createBufferSource(), w.buffer = C, w.loop = !0, w.connect(T), w.start(0, D % C.duration), E = x.currentTime - D;
	}
	async function I() {
		n.disabled = !0;
		try {
			await P(), x.state !== "running" && await x.resume(), O ? (D = x.currentTime - E, w?.stop(), w = null, O = !1) : (F(), O = !0);
		} catch (e) {
			s.textContent = `Audio couldn't start: ${e.message}`;
		} finally {
			n.disabled = !1, e.classList.toggle("is-playing", O), n.setAttribute("aria-pressed", String(O)), n.setAttribute("aria-label", O ? "Pause" : "Play");
		}
	}
	n.addEventListener("click", I), i.addEventListener("click", (e) => {
		let t = e.target.closest("[data-scene]");
		t && (k = t.dataset.scene, A = k === "original" ? p(d) : m(k, p(d)), i.querySelectorAll(".pad").forEach((e) => {
			let n = e === t;
			e.classList.toggle("on", n), e.setAttribute("aria-pressed", String(n));
		}), s.textContent = g.find((e) => e.id === k).note, N(), O || I());
	});
	let L = (e) => {
		j = e, r.classList.toggle("on", e), N();
	};
	r.addEventListener("pointerdown", (e) => {
		r.setPointerCapture(e.pointerId), L(!0);
	}), r.addEventListener("pointerup", () => L(!1)), r.addEventListener("pointercancel", () => L(!1)), r.addEventListener("keydown", (e) => {
		(e.key === " " || e.key === "Enter") && (e.preventDefault(), L(!0));
	}), r.addEventListener("keyup", (e) => {
		(e.key === " " || e.key === "Enter") && L(!1);
	});
	let R = () => {
		let e = Number(a.value);
		o.textContent = e < -2 ? `LOW-PASS ${-e}` : e > 2 ? `HIGH-PASS ${e}` : "OPEN", a.style.setProperty("--p", `${(e + 100) / 2}%`);
	};
	a.addEventListener("input", () => {
		R(), N();
	}), a.addEventListener("dblclick", () => {
		a.value = "0", R(), N();
	}), R();
	let z = f.getContext("2d"), B = [], V = () => {
		let e = f.getBoundingClientRect(), t = window.devicePixelRatio || 1;
		f.width = Math.round(e.width * t), f.height = Math.round(e.height * t), z.setTransform(t, 0, 0, t, 0, 0);
	};
	V(), new ResizeObserver(V).observe(f);
	let H = [0, 0], U = (e) => {
		requestAnimationFrame(U);
		let t = f.clientWidth, n = f.clientHeight;
		if (!t) return;
		let r = S && O ? S.spectrum() : null, i = r ? r.length : 48;
		for (; B.length < i;) B.push(0);
		z.clearRect(0, 0, t, n);
		let a = (t - 3 * (i - 1)) / i, o = z.createLinearGradient(0, n, 0, 0);
		o.addColorStop(0, "#f08a12"), o.addColorStop(.6, "#ffb52e"), o.addColorStop(1, "#ffe08a"), z.fillStyle = o;
		for (let t = 0; t < i; t++) {
			let i = r ? r[t] / 255 : .05 + .03 * Math.sin(e / 700 + t * .4);
			B[t] += (i - B[t]) * (i > B[t] ? .55 : .15);
			let o = Math.max(2, B[t] * (n - 4));
			z.globalAlpha = r ? 1 : .25, z.fillRect(t * (a + 3), n - o, a, o);
		}
		if (z.globalAlpha = 1, S && O) {
			let e = S.outMeter.read();
			for (let t = 0; t < 2; t++) {
				let n = e.peak[t] > 1e-5 ? 20 * Math.log10(e.peak[t]) : -90, r = Math.max(0, Math.min(1, (n + 48) / 48));
				H[t] = r > H[t] ? r : H[t] - .02;
			}
		} else H[0] = Math.max(0, H[0] - .02), H[1] = Math.max(0, H[1] - .02);
		if (v.style.setProperty("--v", String(H[0])), y.style.setProperty("--v", String(H[1])), x && C) {
			let e = O ? (x.currentTime - E) % C.duration : D % C.duration;
			c.textContent = `${_(e)} / ${_(C.duration)}`, l.style.setProperty("--p", `${e / C.duration * 100}%`);
		}
	};
	requestAnimationFrame(U);
}
document.querySelectorAll("[data-demo]").forEach(v);
export { v as mountDemo };
